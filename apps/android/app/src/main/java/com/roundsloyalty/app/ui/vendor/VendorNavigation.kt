package com.roundsloyalty.app.ui.vendor

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.roundsloyalty.app.data.models.Profile

@Composable
fun VendorNavigation(profile: Profile, onSignOut: () -> Unit) {
    val navController = rememberNavController()

    val items = listOf(
        Triple("dashboard", "Dashboard", Icons.Default.BarChart),
        Triple("qr", "QR Code", Icons.Default.QrCode),
        Triple("customers", "Customers", Icons.Default.Group),
        Triple("offers", "Offers", Icons.Default.Mail),
        Triple("settings", "Settings", Icons.Default.Settings),
    )

    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                items.forEach { (route, label, icon) ->
                    NavigationBarItem(
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label) },
                        selected = currentDestination?.hierarchy?.any { it.route == route } == true,
                        onClick = {
                            navController.navigate(route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                    )
                }
            }
        }
    ) { padding ->
        NavHost(navController, startDestination = "dashboard",
            modifier = androidx.compose.ui.Modifier.padding(padding)) {
            composable("dashboard") { DashboardScreen(profile) }
            composable("qr") { QRScreen(profile) }
            composable("customers") { CustomersScreen(profile) }
            composable("offers") { OffersScreen(profile) }
            composable("settings") { SettingsScreen(profile, onSignOut) }
        }
    }
}
