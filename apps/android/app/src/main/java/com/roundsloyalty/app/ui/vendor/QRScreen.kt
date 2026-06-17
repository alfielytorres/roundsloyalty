package com.roundsloyalty.app.ui.vendor

import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.roundsloyalty.app.data.SupabaseClient
import com.roundsloyalty.app.data.models.Business
import com.roundsloyalty.app.data.models.Profile
import com.roundsloyalty.app.ui.theme.Cream
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

fun generateQrBitmap(content: String, size: Int = 512): Bitmap {
    val bits = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size)
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
    for (x in 0 until size) for (y in 0 until size)
        bmp.setPixel(x, y, if (bits[x, y]) Color.BLACK else Color.WHITE)
    return bmp
}

@Composable
fun QRScreen(profile: Profile) {
    val supabase = SupabaseClient.client
    var business by remember { mutableStateOf<Business?>(null) }
    var qrBitmap by remember { mutableStateOf<Bitmap?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(profile.id) {
        scope.launch {
            try {
                business = supabase.postgrest["businesses"]
                    .select { filter { eq("owner_id", profile.id) } }
                    .decodeSingleOrNull()
                while (true) {
                    val biz = business ?: break
                    val secret = biz.qrCodeSecret ?: break
                    val bucket = System.currentTimeMillis() / (4 * 60 * 1000)
                    val payload = "${biz.id}:$bucket:$secret"
                    qrBitmap = generateQrBitmap(payload)
                    delay(4 * 60 * 1000L)
                }
            } catch (_: Exception) {}
        }
    }

    Surface(color = Cream, modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center) {
            Text("Store QR Code", style = MaterialTheme.typography.headlineLarge)
            Spacer(Modifier.height(8.dp))
            Text("Customers scan this to earn stamps", color = MaterialTheme.colorScheme.onSurface.copy(0.6f))
            Spacer(Modifier.height(32.dp))
            Card(shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color.White)) {
                Box(modifier = Modifier.padding(24.dp).size(240.dp), contentAlignment = Alignment.Center) {
                    qrBitmap?.let {
                        Image(bitmap = it.asImageBitmap(), contentDescription = "Store QR code",
                            modifier = Modifier.fillMaxSize())
                    } ?: CircularProgressIndicator()
                }
            }
            Spacer(Modifier.height(16.dp))
            Text("Refreshes every 4 minutes", color = MaterialTheme.colorScheme.onSurface.copy(0.4f),
                style = MaterialTheme.typography.bodySmall)
        }
    }
}
