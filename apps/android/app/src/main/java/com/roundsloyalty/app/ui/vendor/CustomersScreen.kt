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
import com.roundsloyalty.app.ui.theme.GreenLight
import com.roundsloyalty.app.ui.theme.GreenPrimary
import com.roundsloyalty.app.ui.theme.Taupe
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CustomerSegment(
    @SerialName("customer_id") val customerId: String,
    @SerialName("display_name") val displayName: String?,
    @SerialName("total_visits") val totalVisits: Int,
    @SerialName("stamps_collected") val stampsCollected: Int,
    @SerialName("last_visit") val lastVisit: String?,
    val segment: String?,
)

@Composable
fun CustomersScreen(profile: Profile) {
    val supabase = SupabaseClient.client
    var business by remember { mutableStateOf<Business?>(null) }
    var customers by remember { mutableStateOf<List<CustomerSegment>>(emptyList()) }
    var selectedSegment by remember { mutableStateOf("all") }
    val scope = rememberCoroutineScope()

    LaunchedEffect(profile.id, selectedSegment) {
        scope.launch {
            try {
                if (business == null) {
                    business = supabase.postgrest["businesses"]
                        .select { filter { eq("owner_id", profile.id) } }
                        .decodeSingleOrNull()
                }
                val biz = business ?: return@launch
                customers = supabase.postgrest["vendor_customer_segments"]
                    .select {
                        filter {
                            eq("business_id", biz.id)
                            if (selectedSegment != "all") eq("segment", selectedSegment)
                        }
                        order("total_visits", io.github.jan.supabase.postgrest.query.Order.DESCENDING)
                    }.decodeList()
            } catch (_: Exception) {}
        }
    }

    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text("Customers", style = MaterialTheme.typography.headlineLarge,
                    modifier = Modifier.padding(vertical = 8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("all", "top", "returning", "at_risk").forEach { seg ->
                        FilterChip(selected = selectedSegment == seg, onClick = { selectedSegment = seg },
                            label = { Text(if (seg == "at_risk") "At risk" else seg.replaceFirstChar { it.uppercase() }) })
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
            items(customers) { c ->
                Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color.White)) {
                    Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(c.displayName ?: "Anonymous", style = MaterialTheme.typography.bodyLarge)
                            Text("${c.totalVisits} visits · ${c.stampsCollected} stamps", color = Taupe,
                                style = MaterialTheme.typography.bodySmall)
                        }
                        c.segment?.let {
                            Surface(color = if (it == "top") GreenPrimary else GreenLight,
                                shape = RoundedCornerShape(8.dp)) {
                                Text(it, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (it == "top") androidx.compose.ui.graphics.Color.White else GreenPrimary)
                            }
                        }
                    }
                }
            }
        }
    }
}
