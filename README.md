# Cardano Tools GitHub Action

## Overview
This GitHub Action facilitates the integration of Cardano tools into workflows, enabling easy access and manipulation of Cardano-related tasks in your CI/CD pipelines.

## Features
Automatically downloads and installs the latest Cardano tools.
Configures the environment to make the tools accessible throughout the workflow.

## Usage
To use this action in your workflow just add the following lines to your workflow file:

```yaml
- name: Install Cardano tools
  uses: milos-ethernal/cardano-node-action@{sha}
  with:
    tag: '10.1.4'
    prefix: 'prime'
```

Tag is optional parameter, if not defined action will use cardano-node release version 8.7.3.
Prefix is optional parameter used in case that you need multiple binaries installed. It will rename installed version so you can use it as in [test action](.github/workflows/test-action.yaml).

After this step bech32, cardano-cli and cardano-node will be available in your workflow.
You can use them in your scripts or directly execute them in your workflow steps.
e.g.
```yaml
- name: Create payment address
  run: |
    paymentAddress=$(cardano-cli address build \
      --payment-verification-key-file payment.vkey \
      --testnet-magic 1097911063)
```

##Contributing
Contributions to this action are welcome! Please follow the standard pull request process to suggest improvements or add new features.