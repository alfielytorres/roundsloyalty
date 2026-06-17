package com.roundsloyalty.app.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoyaltyCard(
    val id: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("program_id") val programId: String,
    @SerialName("stamps_collected") val stampsCollected: Int = 0,
    @SerialName("points_accumulated") val pointsAccumulated: Int = 0,
    val tier: String? = null,
    @SerialName("last_visit") val lastVisit: String? = null,
)
