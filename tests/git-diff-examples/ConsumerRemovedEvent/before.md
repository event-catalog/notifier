---
id: InventoryService
version: 0.0.2
name: Inventory Service
summary: |
  Service that handles the inventory
owners:
  - order-management
receives:
  - id: OrderConfirmed
  - id: GetInventoryList
sends:
  - id: InventoryAdjusted
  - id: OutOfStock
  - id: GetOrder
---

# Inventory Service

<Admonition type="info">
This service handles all inventory management for our e-commerce platform.
</Admonition>

## Overview

The Inventory Service is responsible for:

- Managing stock levels
- Processing inventory updates
- Sending inventory notifications

## Architecture

```mermaid
graph TD
    A[Inventory Service] --> B[Database]
    A --> C[Event Bus]
    C --> D[Notification Service]
```
