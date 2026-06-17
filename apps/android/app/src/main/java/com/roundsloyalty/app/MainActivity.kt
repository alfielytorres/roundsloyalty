package com.roundsloyalty.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.roundsloyalty.app.ui.navigation.AppNavigation
import com.roundsloyalty.app.ui.theme.RoundsLoyaltyTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            RoundsLoyaltyTheme {
                AppNavigation()
            }
        }
    }
}
