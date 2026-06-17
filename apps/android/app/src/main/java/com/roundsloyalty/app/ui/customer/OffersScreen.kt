package com.roundsloyalty.app.ui.customer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.roundsloyalty.app.data.SupabaseClient
import com.roundsloyalty.app.data.models.Profile
import com.roundsloyalty.app.ui.theme.Cream
import com.roundsloyalty.app.ui.theme.Taupe
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OfferRecipient(
    val id: String,
    @SerialName("offer_id") val offerId: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("delivered_at") val deliveredAt: String? = null,
    @SerialName("opened_at") val openedAt: String? = null,
)

@Composable
fun OffersScreen(profile: Profile) {
    val supabase = SupabaseClient.client
    var offers by remember { mutableStateOf<List<OfferRecipient>>(emptyList()) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(profile.id) {
        scope.launch {
            try {
                offers = supabase.postgrest["offer_recipients"]
                    .select { filter { eq("customer_id", profile.id) } }
                    .decodeList()
            } catch (_: Exception) {}
        }
    }

    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Text("Offers", style = MaterialTheme.typography.headlineLarge,
                    modifier = Modifier.padding(vertical = 8.dp))
            }
            if (offers.isEmpty()) {
                item { Text("No offers yet.", color = Taupe) }
            }
            items(offers) { offer ->
                Card(shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color.White)) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Offer", style = MaterialTheme.typography.bodyLarge)
                        offer.deliveredAt?.let {
                            Text("Received ${it.take(10)}", color = Taupe, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}
