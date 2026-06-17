package com.roundsloyalty.app.ui.customer

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.roundsloyalty.app.ui.theme.Cream
import com.roundsloyalty.app.ui.theme.GreenPrimary

// Full CameraX + ML Kit integration requires device testing.
// This screen is a scaffold — wire up the QR scanner view here.
@Composable
fun ScanScreen() {
    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center) {
            Text("Scan QR Code", style = MaterialTheme.typography.headlineLarge)
            Spacer(Modifier.height(8.dp))
            Text("Point your camera at the store's QR code to earn stamps.",
                style = MaterialTheme.typography.bodyMedium, color = GreenPrimary)
            Spacer(Modifier.height(32.dp))
            // TODO: embed CameraPreview composable with ML Kit barcode scanner
            Box(modifier = Modifier.size(280.dp), contentAlignment = Alignment.Center) {
                Card(modifier = Modifier.fillMaxSize()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Camera preview", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                    }
                }
            }
        }
    }
}
