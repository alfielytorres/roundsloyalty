package com.roundsloyalty.app.ui.vendor

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.roundsloyalty.app.data.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ComposeOfferSheet(businessId: String, onDismiss: () -> Unit, onSent: () -> Unit) {
    val supabase = SupabaseClient.client
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var segment by remember { mutableStateOf("all") }
    var sending by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("New Offer", style = MaterialTheme.typography.headlineMedium)
            OutlinedTextField(value = title, onValueChange = { title = it },
                label = { Text("Title") }, modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp), singleLine = true)
            OutlinedTextField(value = body, onValueChange = { body = it },
                label = { Text("Message") }, modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp), minLines = 3)
            Text("Send to:", style = MaterialTheme.typography.bodyLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("all", "top", "returning", "at_risk").forEach { seg ->
                    FilterChip(selected = segment == seg, onClick = { segment = seg },
                        label = { Text(if (seg == "at_risk") "At risk" else seg.replaceFirstChar { it.uppercase() }) })
                }
            }
            Button(onClick = {
                sending = true
                scope.launch {
                    try {
                        supabase.postgrest["offers"].insert(buildJsonObject {
                            put("business_id", businessId)
                            put("title", title)
                            put("body", body)
                            put("target_segment", segment)
                        })
                        onSent()
                    } catch (_: Exception) { sending = false }
                }
            }, modifier = Modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(12.dp),
                enabled = title.isNotBlank() && body.isNotBlank() && !sending) {
                Text(if (sending) "Sending…" else "Send offer")
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}
