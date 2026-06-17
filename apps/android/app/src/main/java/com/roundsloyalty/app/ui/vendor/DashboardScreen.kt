package com.roundsloyalty.app.ui.vendor

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.roundsloyalty.app.data.SupabaseClient
import com.roundsloyalty.app.data.models.Business
import com.roundsloyalty.app.data.models.Profile
import com.roundsloyalty.app.ui.theme.Cream
import com.roundsloyalty.app.ui.theme.GreenLight
import com.roundsloyalty.app.ui.theme.GreenPrimary
import com.roundsloyalty.app.ui.theme.Taupe
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch

@Composable
fun DashboardScreen(profile: Profile) {
    val supabase = SupabaseClient.client
    var business by remember { mutableStateOf<Business?>(null) }
    var totalCustomers by remember { mutableStateOf(0L) }
    var weekVisits by remember { mutableStateOf(0L) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(profile.id) {
        scope.launch {
            try {
                business = supabase.postgrest["businesses"]
                    .select { filter { eq("owner_id", profile.id) } }
                    .decodeSingleOrNull()
                val biz = business ?: return@launch
                val weekAgo = java.time.Instant.now().minusSeconds(7 * 24 * 3600).toString()
                totalCustomers = supabase.postgrest["vendor_customer_segments"]
                    .select(count = io.github.jan.supabase.postgrest.query.Count.EXACT) {
                        filter { eq("business_id", biz.id) }
                    }.countOrNull() ?: 0
                weekVisits = supabase.postgrest["visit_events"]
                    .select(count = io.github.jan.supabase.postgrest.query.Count.EXACT) {
                        filter { eq("business_id", biz.id); gte("created_at", weekAgo) }
                    }.countOrNull() ?: 0
            } catch (_: Exception) {}
        }
    }

    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Text("Dashboard", style = MaterialTheme.typography.headlineLarge,
                    modifier = Modifier.padding(vertical = 8.dp))
                business?.let { Text("Welcome back, ${it.name}", color = Taupe) }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatCard("Total customers", totalCustomers.toString(), Modifier.weight(1f))
                    StatCard("Visits this week", weekVisits.toString(), Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(shape = RoundedCornerShape(20.dp), modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color.White)) {
        Column(Modifier.padding(16.dp)) {
            Text(value, style = MaterialTheme.typography.headlineLarge, color = GreenPrimary)
            Text(label, color = Taupe, style = MaterialTheme.typography.bodySmall)
        }
    }
}
