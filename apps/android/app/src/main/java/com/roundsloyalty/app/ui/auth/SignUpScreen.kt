package com.roundsloyalty.app.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.roundsloyalty.app.ui.theme.Cream
import com.roundsloyalty.app.ui.theme.GreenLight
import com.roundsloyalty.app.ui.theme.GreenPrimary
import com.roundsloyalty.app.viewmodel.AuthViewModel

@Composable
fun SignUpScreen(viewModel: AuthViewModel, onNavigateToSignIn: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("customer") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("Create account", style = MaterialTheme.typography.headlineLarge)
            Spacer(Modifier.height(32.dp))

            OutlinedTextField(value = displayName, onValueChange = { displayName = it },
                label = { Text("Name") }, modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp), singleLine = true)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(value = email, onValueChange = { email = it },
                label = { Text("Email") }, modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp), singleLine = true)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(value = password, onValueChange = { password = it },
                label = { Text("Password") }, visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), singleLine = true)

            Spacer(Modifier.height(20.dp))
            Text("I am a…", style = MaterialTheme.typography.bodyLarge)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                listOf("customer" to "Customer", "vendor" to "Business owner").forEach { (value, label) ->
                    val selected = role == value
                    Button(
                        onClick = { role = value },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (selected) GreenPrimary else GreenLight,
                            contentColor = if (selected) androidx.compose.ui.graphics.Color.White else androidx.compose.ui.graphics.Color.Black,
                        ),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.weight(1f),
                    ) { Text(label) }
                }
            }

            error?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(Modifier.height(24.dp))
            Button(
                onClick = {
                    loading = true; error = null
                    viewModel.signUp(email, password, displayName, role) { msg -> error = msg; loading = false }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp),
                enabled = !loading,
            ) { Text(if (loading) "Creating…" else "Create account") }
            Spacer(Modifier.height(12.dp))
            TextButton(onClick = onNavigateToSignIn) {
                Text("Already have an account? Sign in", color = GreenPrimary)
            }
        }
    }
}
