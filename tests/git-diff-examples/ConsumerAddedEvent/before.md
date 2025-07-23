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
sends:
  - id: InventoryAdjusted
  - id: OutOfStock
  - id: GetOrder
---

Example markdown
