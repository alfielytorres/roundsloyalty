package com.roundsloyalty.app.ui.customer

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCodeScanner
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
fun CustomerNavigation(profile: Profile, onSignOut: () -> Unit) {
    val navController = rememberNavController()

    val items = listOf(
        Triple("cards", "Cards", Icons.Default.CreditCard),
        Triple("scan", "Scan", Icons.Default.QrCodeScanner),
        Triple("map", "Discover", Icons.Default.Map),
        Triple("offers", "Offers", Icons.Default.Mail),
        Triple("profile", "Profile", Icons.Default.Person),
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
        NavHost(navController, startDestination = "cards", modifier = androidx.compose.ui.Modifier.padding(padding)) {
            composable("cards") { CardsScreen(profile) }
            composable("scan") { ScanScreen() }
            composable("map") { MapScreen() }
            composable("offers") { OffersScreen(profile) }
            composable("profile") { ProfileScreen(profile, onSignOut) }
        }
    }
}
