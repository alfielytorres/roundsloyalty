package com.roundsloyalty.app.ui.customer

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import com.roundsloyalty.app.data.SupabaseClient
import com.roundsloyalty.app.data.models.Business
import com.roundsloyalty.app.ui.theme.Cream
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch

@Composable
fun MapScreen() {
    val supabase = SupabaseClient.client
    var businesses by remember { mutableStateOf<List<Business>>(emptyList()) }
    val scope = rememberCoroutineScope()
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(LatLng(51.5074, -0.1278), 12f)
    }

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                businesses = supabase.postgrest["businesses"]
                    .select { filter { not { isNull("lat") } } }
                    .decodeList()
            } catch (_: Exception) {}
        }
    }

    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            Text("Discover", style = MaterialTheme.typography.headlineLarge,
                modifier = Modifier.padding(16.dp))
            GoogleMap(modifier = Modifier.fillMaxSize(), cameraPositionState = cameraPositionState) {
                businesses.forEach { business ->
                    val lat = business.lat ?: return@forEach
                    val lng = business.lng ?: return@forEach
                    Marker(state = MarkerState(position = LatLng(lat, lng)), title = business.name)
                }
            }
        }
    }
}
