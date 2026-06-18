package com.roundsloyalty.app.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Membership(
    val id: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("vendor_id") val vendorId: String,
    val status: String, // pending, active, inactive
    @SerialName("membership_token") val membershipToken: String,
    @SerialName("joined_at") val joinedAt: String? = null,
    @SerialName("activated_at") val activatedAt: String? = null,
)
