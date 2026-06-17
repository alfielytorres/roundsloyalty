package com.roundsloyalty.app.ui.vendor

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Offer(
    val id: String,
    val title: String,
    val body: String,
    @SerialName("target_segment") val targetSegment: String,
    @SerialName("sent_at") val sentAt: String?,
)

@Composable
fun OffersScreen(profile: Profile) {
    val supabase = SupabaseClient.client
    var business by remember { mutableStateOf<Business?>(null) }
    var offers by remember { mutableStateOf<List<Offer>>(emptyList()) }
    var showCompose by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(profile.id) {
        scope.launch {
            try {
                business = supabase.postgrest["businesses"]
                    .select { filter { eq("owner_id", profile.id) } }
                    .decodeSingleOrNull()
                val biz = business ?: return@launch
                offers = supabase.postgrest["offers"]
                    .select { filter { eq("business_id", biz.id) } }
                    .decodeList()
            } catch (_: Exception) {}
        }
    }

    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                    Text("Offers", style = MaterialTheme.typography.headlineLarge)
                    Button(onClick = { showCompose = true }, shape = RoundedCornerShape(12.dp)) {
                        Text("New offer")
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
            if (offers.isEmpty()) {
                item { Text("No offers sent yet.", color = Taupe) }
            }
            items(offers) { offer ->
                GlassCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 16.dp) {
                    Column(Modifier.padding(16.dp)) {
                        Text(offer.title, style = MaterialTheme.typography.bodyLarge)
                        Spacer(Modifier.height(4.dp))
                        Text(offer.body, color = Taupe, style = MaterialTheme.typography.bodySmall, maxLines = 2)
                        Spacer(Modifier.height(4.dp))
                        Text("To: ${offer.targetSegment} · ${offer.sentAt?.take(10) ?: "draft"}",
                            color = Taupe, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }

    if (showCompose) {
        ComposeOfferSheet(
            businessId = business?.id ?: "",
            onDismiss = { showCompose = false },
            onSent = {
                showCompose = false
                scope.launch {
                    val biz = business ?: return@launch
                    offers = supabase.postgrest["offers"]
                        .select { filter { eq("business_id", biz.id) } }
                        .decodeList()
                }
            },
        )
    }
}
