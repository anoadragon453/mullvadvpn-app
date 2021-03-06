package net.mullvad.mullvadvpn.service

import net.mullvad.mullvadvpn.model.RelaySettings
import net.mullvad.mullvadvpn.model.Settings
import net.mullvad.talpid.util.EventNotifier

class SettingsListener(val daemon: MullvadDaemon, val initialSettings: Settings) {
    var settings: Settings = initialSettings
        private set(value) {
            settingsNotifier.notify(value)
            field = value
        }

    private val settingsNotifier: EventNotifier<Settings> = EventNotifier(settings)

    private val listenerId = daemon.onSettingsChange.subscribe { maybeSettings ->
        maybeSettings?.let { settings -> handleNewSettings(settings) }
    }

    val accountNumberNotifier = EventNotifier(initialSettings.accountToken)

    var onRelaySettingsChange: ((RelaySettings?) -> Unit)? = null
        set(value) {
            synchronized(this) {
                field = value
                value?.invoke(settings.relaySettings)
            }
        }

    fun onDestroy() {
        daemon.onSettingsChange.unsubscribe(listenerId)

        accountNumberNotifier.unsubscribeAll()
        settingsNotifier.unsubscribeAll()
    }

    fun subscribe(listener: (Settings) -> Unit): Int {
        return settingsNotifier.subscribe(listener)
    }

    fun unsubscribe(id: Int) {
        settingsNotifier.unsubscribe(id)
    }

    private fun handleNewSettings(newSettings: Settings) {
        synchronized(this) {
            if (settings.accountToken != newSettings.accountToken) {
                accountNumberNotifier.notify(newSettings.accountToken)
            }

            if (settings.relaySettings != newSettings.relaySettings) {
                onRelaySettingsChange?.invoke(newSettings.relaySettings)
            }

            settings = newSettings
        }
    }
}
