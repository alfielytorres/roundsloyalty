package com.roundsloyalty.app.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoyaltyBalance(
    val id: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("vendor_id") val vendorId: String,
    val stamps: Int = 0,
    val points: Int = 0,
)
