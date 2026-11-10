# AdSense integration

See [ADVERTISING.md](ADVERTISING.md) for the implemented manual responsive placements, Google CMP signal gate, separate production visitor acknowledgement, configuration, initial-hidden-slot caveat and live-launch checklist. The old inert placeholder implementation and unused PUBLIC_ADS_PUBLISHER_ID/PUBLIC_ADS_SLOT_ID scaffolding have been replaced. The supplied publisher and two slot IDs are public identifiers, not secrets. The build switch defaults off and local/testing hosts always remain ad-free.
