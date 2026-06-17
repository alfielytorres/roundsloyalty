package com.roundsloyalty.app.ui.customer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.roundsloyalty.app.data.models.Profile
import com.roundsloyalty.app.ui.theme.Cream
import com.roundsloyalty.app.ui.theme.Taupe

@Composable
fun ProfileScreen(profile: Profile, onSignOut: () -> Unit) {
    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
            Text("Profile", style = MaterialTheme.typography.headlineLarge,
                modifier = Modifier.padding(vertical = 8.dp))
            Spacer(Modifier.height(16.dp))
            Card(shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color.White)) {
                Column(Modifier.padding(20.dp)) {
                    Text(profile.displayName ?: "Customer", style = MaterialTheme.typography.headlineMedium)
                    Spacer(Modifier.height(4.dp))
                    Text("Customer account", color = Taupe, style = MaterialTheme.typography.bodyMedium)
                }
            }
            Spacer(Modifier.height(24.dp))
            OutlinedButton(
                onClick = onSignOut,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
            ) { Text("Sign out") }
        }
    }
}
