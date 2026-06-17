package com.roundsloyalty.app.ui.customer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.roundsloyalty.app.data.SupabaseClient
import com.roundsloyalty.app.data.models.LoyaltyCard
import com.roundsloyalty.app.data.models.Profile
import com.roundsloyalty.app.ui.theme.Cream
import com.roundsloyalty.app.ui.theme.GreenLight
import com.roundsloyalty.app.ui.theme.GreenPrimary
import com.roundsloyalty.app.ui.theme.Taupe
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch

@Composable
fun CardsScreen(profile: Profile) {
    val supabase = SupabaseClient.client
    var cards by remember { mutableStateOf<List<LoyaltyCard>>(emptyList()) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(profile.id) {
        scope.launch {
            try {
                cards = supabase.postgrest["loyalty_cards"]
                    .select { filter { eq("customer_id", profile.id) } }
                    .decodeList()
            } catch (_: Exception) {}
        }
    }

    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Text("My Cards", style = MaterialTheme.typography.headlineLarge,
                    modifier = Modifier.padding(vertical = 8.dp))
            }
            if (cards.isEmpty()) {
                item {
                    Text("Scan a store's QR code to earn your first stamp.",
                        color = Taupe, modifier = Modifier.padding(top = 32.dp))
                }
            }
            items(cards) { card ->
                StampCard(card)
            }
        }
    }
}

@Composable
fun StampCard(card: LoyaltyCard) {
    val stampsRequired = 10
    Card(shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text("Loyalty Card", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(16.dp))
            StampGrid(collected = card.stampsCollected, required = stampsRequired)
            Spacer(Modifier.height(12.dp))
            Text("${card.stampsCollected} / $stampsRequired stamps",
                color = Taupe, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun StampGrid(collected: Int, required: Int) {
    val cols = 5
    val rows = (required + cols - 1) / cols
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(rows) { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(cols) { col ->
                    val index = row * cols + col
                    if (index < required) {
                        Box(modifier = Modifier.size(36.dp).clip(CircleShape)
                            .background(if (index < collected) GreenPrimary else GreenLight))
                    }
                }
            }
        }
    }
}
