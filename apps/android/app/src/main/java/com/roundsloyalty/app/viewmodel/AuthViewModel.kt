package com.roundsloyalty.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roundsloyalty.app.data.SupabaseClient
import com.roundsloyalty.app.data.models.Profile
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class AuthState {
    object Loading : AuthState()
    object SignedOut : AuthState()
    data class Customer(val profile: Profile) : AuthState()
    data class Vendor(val profile: Profile) : AuthState()
}

class AuthViewModel : ViewModel() {
    private val supabase get() = SupabaseClient.client

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState = _authState.asStateFlow()

    init {
        checkSession()
    }

    private fun checkSession() {
        viewModelScope.launch {
            val session = supabase.auth.currentSessionOrNull()
            if (session == null) {
                _authState.value = AuthState.SignedOut
                return@launch
            }
            loadProfile(session.user?.id ?: return@launch)
        }
    }

    private suspend fun loadProfile(userId: String) {
        try {
            val profile = supabase.postgrest["profiles"]
                .select { filter { eq("id", userId) } }
                .decodeSingle<Profile>()
            _authState.value = if (profile.role == "vendor") AuthState.Vendor(profile) else AuthState.Customer(profile)
        } catch (e: Exception) {
            _authState.value = AuthState.SignedOut
        }
    }

    fun signIn(email: String, password: String, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                supabase.auth.signInWith(Email) {
                    this.email = email
                    this.password = password
                }
                val userId = supabase.auth.currentUserOrNull()?.id ?: return@launch
                loadProfile(userId)
            } catch (e: Exception) {
                onError(e.message ?: "Sign in failed")
            }
        }
    }

    fun signUp(email: String, password: String, displayName: String, role: String, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                supabase.auth.signUpWith(Email) {
                    this.email = email
                    this.password = password
                    data = kotlinx.serialization.json.buildJsonObject {
                        put("display_name", kotlinx.serialization.json.JsonPrimitive(displayName))
                        put("role", kotlinx.serialization.json.JsonPrimitive(role))
                    }
                }
                val userId = supabase.auth.currentUserOrNull()?.id ?: return@launch
                loadProfile(userId)
            } catch (e: Exception) {
                onError(e.message ?: "Sign up failed")
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            supabase.auth.signOut()
            _authState.value = AuthState.SignedOut
        }
    }
}
