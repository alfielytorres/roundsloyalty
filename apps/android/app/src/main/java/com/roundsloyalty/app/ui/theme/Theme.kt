package com.roundsloyalty.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = GreenPrimary,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    primaryContainer = GreenLight,
    onPrimaryContainer = GreenDark,
    background = Cream,
    onBackground = GreenDark,
    surface = androidx.compose.ui.graphics.Color.White,
    onSurface = GreenDark,
)

@Composable
fun RoundsLoyaltyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = Typography,
        content = content,
    )
}
