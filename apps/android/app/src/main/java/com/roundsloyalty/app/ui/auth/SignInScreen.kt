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
import com.roundsloyalty.app.ui.theme.GreenDark
import com.roundsloyalty.app.ui.theme.GreenPrimary
import com.roundsloyalty.app.viewmodel.AuthViewModel

@Composable
fun SignInScreen(viewModel: AuthViewModel, onNavigateToSignUp: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("Rounds Loyalty", style = MaterialTheme.typography.headlineLarge, color = GreenPrimary)
            Spacer(Modifier.height(8.dp))
            Text("Reward your customers", style = MaterialTheme.typography.bodyMedium, color = GreenDark)
            Spacer(Modifier.height(48.dp))

            OutlinedTextField(
                value = email, onValueChange = { email = it },
                label = { Text("Email") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                singleLine = true,
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = password, onValueChange = { password = it },
                label = { Text("Password") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                singleLine = true,
            )

            error?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(Modifier.height(24.dp))
            Button(
                onClick = {
                    loading = true; error = null
                    viewModel.signIn(email, password) { msg -> error = msg; loading = false }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp),
                enabled = !loading,
            ) {
                Text(if (loading) "Signing in…" else "Sign in", style = MaterialTheme.typography.bodyLarge)
            }
            Spacer(Modifier.height(12.dp))
            TextButton(onClick = onNavigateToSignUp) {
                Text("Don't have an account? Sign up", color = GreenPrimary)
            }
        }
    }
}
