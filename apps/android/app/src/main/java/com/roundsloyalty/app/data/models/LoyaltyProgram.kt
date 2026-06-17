package com.roundsloyalty.app.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoyaltyProgram(
    val id: String,
    @SerialName("business_id") val businessId: String,
    val type: String,
    @SerialName("reward_description") val rewardDescription: String? = null,
    @SerialName("is_active") val isActive: Boolean = true,
)
