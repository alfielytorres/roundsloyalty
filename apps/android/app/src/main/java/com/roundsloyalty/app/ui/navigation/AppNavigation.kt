package com.roundsloyalty.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.roundsloyalty.app.ui.auth.SignInScreen
import com.roundsloyalty.app.ui.auth.SignUpScreen
import com.roundsloyalty.app.ui.customer.CustomerNavigation
import com.roundsloyalty.app.ui.vendor.VendorNavigation
import com.roundsloyalty.app.viewmodel.AuthState
import com.roundsloyalty.app.viewmodel.AuthViewModel

@Composable
fun AppNavigation() {
    val authViewModel: AuthViewModel = viewModel()
    val authState by authViewModel.authState.collectAsState()
    val navController = rememberNavController()

    when (val state = authState) {
        is AuthState.Loading -> { /* splash / blank */ }
        is AuthState.SignedOut -> {
            NavHost(navController, startDestination = "sign_in") {
                composable("sign_in") {
                    SignInScreen(
                        viewModel = authViewModel,
                        onNavigateToSignUp = { navController.navigate("sign_up") },
                    )
                }
                composable("sign_up") {
                    SignUpScreen(
                        viewModel = authViewModel,
                        onNavigateToSignIn = { navController.popBackStack() },
                    )
                }
            }
        }
        is AuthState.Customer -> CustomerNavigation(profile = state.profile, onSignOut = { authViewModel.signOut() })
        is AuthState.Vendor -> VendorNavigation(profile = state.profile, onSignOut = { authViewModel.signOut() })
    }
}
