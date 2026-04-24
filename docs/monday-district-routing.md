# Monday District Routing Contract

This app can auto-assign new contact records to a Monday owner based on Florida districts.

## Goal

When a contact item is created on the contact board, routing should:

1. Read the contact address/zip/city from the new item
2. Resolve county via the US Census geocoder
3. Resolve district from a county-to-district Monday board
4. Resolve owner from a district-to-owner Monday board
5. Update the contact board people column with the resolved owner

## Required Environment Variables

- `MONDAY_BOARD_ID`: Target contact board where new items are created
- `MONDAY_ROUTING_COUNTY_BOARD_ID`: Board containing county -> district mappings
- `MONDAY_ROUTING_DISTRICT_BOARD_ID`: Board containing district -> owner mappings

Optional explicit column IDs (recommended if board schemas change frequently):

- `MONDAY_ROUTING_COUNTY_NAME_COLUMN_ID`
- `MONDAY_ROUTING_COUNTY_DISTRICT_COLUMN_ID`
- `MONDAY_ROUTING_COUNTY_ACTIVE_COLUMN_ID`
- `MONDAY_ROUTING_DISTRICT_CODE_COLUMN_ID`
- `MONDAY_ROUTING_DISTRICT_OWNER_COLUMN_ID`
- `MONDAY_ROUTING_DISTRICT_ACTIVE_COLUMN_ID`

## Board A: County District Map

One item per county (67 for Florida).

Minimum required fields:

- County name (item name or text column)
- District code (`D1`..`D13`) (status/dropdown/text column)
- Active flag (optional, defaults to active if omitted)

Recommended item naming:

- Item name: `County Name` (e.g. `Orange`)
- District column value: `D5`

## Board B: District Ownership

One item per district (`D1`..`D13`).

Minimum required fields:

- District code (item name or text/status column)
- Owner people column (single person preferred)
- Active flag (optional, defaults to active if omitted)

Recommended item naming:

- Item name: `D1`, `D2`, ... `D13`

## Webhook Trigger

Configure a Monday webhook/automation for **item created** on the contact board to call:

- `POST /api/monday/routing/webhook`

The webhook route handles Monday challenge responses and event payloads.

## Operational Notes

- Existing owner assignments are preserved by default (idempotent behavior).
- If routing cannot resolve owner, the item is left unchanged and the failure is logged.
- Use the admin rerun endpoint from the settings tab for one-off fixes after mapping updates.
