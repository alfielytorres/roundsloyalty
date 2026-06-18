package com.roundsloyalty.app.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Vendor(
    val id: String,
    @SerialName("business_name") val businessName: String,
    @SerialName("logo_url") val logoUrl: String? = null,
    val category: String? = null,
    val description: String? = null,
    @SerialName("proof_of_purchase_enabled") val proofOfPurchaseEnabled: Boolean = false,
    val status: String = "active",
)
