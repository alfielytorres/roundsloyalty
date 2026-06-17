package com.roundsloyalty.app.ui.vendor

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.roundsloyalty.app.data.SupabaseClient
import com.roundsloyalty.app.data.models.Business
import com.roundsloyalty.app.data.models.Profile
import com.roundsloyalty.app.ui.theme.Cream
import com.roundsloyalty.app.ui.theme.GlassCard
import com.roundsloyalty.app.ui.theme.Taupe
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

@Composable
fun SettingsScreen(profile: Profile, onSignOut: () -> Unit) {
    val supabase = SupabaseClient.client
    var business by remember { mutableStateOf<Business?>(null) }
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var saved by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(profile.id) {
        scope.launch {
            try {
                val biz = supabase.postgrest["businesses"]
                    .select { filter { eq("owner_id", profile.id) } }
                    .decodeSingleOrNull<Business>()
                business = biz
                name = biz?.name ?: ""
                description = biz?.description ?: ""
                address = biz?.address ?: ""
            } catch (_: Exception) {}
        }
    }

    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Settings", style = MaterialTheme.typography.headlineLarge)

            GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 20.dp) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Business details", style = MaterialTheme.typography.headlineMedium)
                    OutlinedTextField(value = name, onValueChange = { name = it },
                        label = { Text("Business name") }, modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp), singleLine = true)
                    OutlinedTextField(value = description, onValueChange = { description = it },
                        label = { Text("Description") }, modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp), minLines = 2)
                    OutlinedTextField(value = address, onValueChange = { address = it },
                        label = { Text("Address") }, modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp), singleLine = true)
                    if (saved) Text("Saved!", color = MaterialTheme.colorScheme.primary)
                    Button(onClick = {
                        saving = true; saved = false
                        scope.launch {
                            try {
                                val biz = business
                                if (biz != null) {
                                    supabase.postgrest["businesses"].update(buildJsonObject {
                                        put("name", name)
                                        put("description", description)
                                        put("address", address)
                                    }) { filter { eq("id", biz.id) } }
                                } else {
                                    supabase.postgrest["businesses"].insert(buildJsonObject {
                                        put("owner_id", profile.id)
                                        put("name", name)
                                        put("description", description)
                                        put("address", address)
                                    })
                                }
                                saved = true
                            } catch (_: Exception) {}
                            saving = false
                        }
                    }, shape = RoundedCornerShape(12.dp), enabled = !saving) {
                        Text(if (saving) "Saving…" else "Save changes")
                    }
                }
            }

            GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 20.dp) {
                Column(Modifier.padding(20.dp)) {
                    Text("Account", style = MaterialTheme.typography.headlineMedium)
                    Spacer(Modifier.height(4.dp))
                    Text(profile.displayName ?: "", color = Taupe)
                    Spacer(Modifier.height(12.dp))
                    OutlinedButton(onClick = onSignOut, shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)) {
                        Text("Sign out")
                    }
                }
            }
        }
    }
}
