# SumRM Integration

This document describes the integration between Sum and SumRM systems for artefact synchronization.

## Overview

The SumRM integration allows the Sum application to fetch the latest artefact values from the SumRM system and display them in model cards. When a user edits a specific artefact on the same model in SumRM, the system will fetch that value and compare it with the local value by date, showing the latest one in the model card.

## Configuration

### Environment Variables

Add the following environment variables to your configuration:

```bash
# SumRM API configuration
SUMRM_API=https://your-sumrm-api-url.com
SUMRM_SYNC_ENABLED=true
SUMRM_PREFER_SUMRM=false
SUMRM_API_TIMEOUT=5000
```

### Environment Variables Description

- `SUMRM_API`: Base URL for the SumRM API (required)
- `SUMRM_SYNC_ENABLED`: Enable/disable SumRM synchronization (default: false)
- `SUMRM_PREFER_SUMRM`: When dates are equal, prefer SumRM values over local values (default: false)
- `SUMRM_API_TIMEOUT`: Timeout for API calls in milliseconds (default: 5000)

## Synchronized Artefacts

The following artefact IDs are configured for synchronization:

- `803`: RFD

To add more artefacts for synchronization, edit the `SYNC_ARTEFACT_IDS` array in `app/src/common/sumrmConfig.js`.

## API Integration

The integration uses the SumRM Artefact Realizations API:

### Endpoint
`GET /api/v1/artefact-realizations/by-key`

### Parameters
- `model_id` (string, required): The model identifier
- `artefact_id` (string, required): The artefact identifier
- `as_of` (ISO-8601 timestamp, optional): Point-in-time query

### Response Format
```json
{
  "model_id": "mdl_123",
  "artefact_id": "803",
  "artefact_value_id": "998877665544332211",
  "artefact_string_value": "Да",
  "artefact_original_value": "Да",
  "artefact_custom_type": "string",
  "creator": "user@domain.com",
  "effective_from": "2024-06-01T15:30:00Z",
  "effective_to": "9999-12-31T23:59:59Z",
  "is_active": true
}
```

## Implementation Details

### Files Modified/Created

1. **`app/src/connectors/integration/sumrm/connector.js`** - HTTP connector for SumRM API
2. **`app/src/connectors/integration/sumrm/index.js`** - SumRM integration class
3. **`app/src/connectors/integration/index.js`** - Added SumRM to integration exports
4. **`app/src/common/sumrmConfig.js`** - Configuration for synchronized artefacts
5. **`app/src/models/card/helpers/artefactMerger.js`** - Helper functions for merging artefacts
6. **`app/src/models/card/index.js`** - Updated `one` method to include SumRM synchronization

### How It Works

1. When a model card is requested via the `one` method, the system:
   - Fetches local artefacts from the database
   - If SumRM sync is enabled, fetches artefacts from SumRM API
   - Compares artefacts by effective date
   - Returns the latest value for each synchronized artefact
   - Falls back to local values if SumRM is unavailable

2. The comparison logic:
   - Compares `effective_from` dates between local and SumRM artefacts
   - Returns the artefact with the more recent date
   - If dates are equal, uses the preference setting (`SUMRM_PREFER_SUMRM`)

3. Error handling:
   - If SumRM API is unavailable, continues with local artefacts only
   - If merge fails, falls back to local artefacts
   - All errors are logged for debugging

## Usage

The integration is automatically active when:
- `SUMRM_SYNC_ENABLED=true`
- `SUMRM_API` is configured
- The Card model's `one` method is called

No additional code changes are required in consuming applications.

## Monitoring

The integration includes comprehensive logging:

- API request/response logging
- Artefact count logging
- Error logging with fallback behavior
- Merge operation logging

Check application logs for SumRM-related messages to monitor the integration.

## Troubleshooting

### Common Issues

1. **SumRM API not responding**
   - Check `SUMRM_API` environment variable
   - Verify network connectivity
   - Check SumRM API status

2. **No artefacts being synchronized**
   - Verify `SUMRM_SYNC_ENABLED=true`
   - Check `SYNC_ARTEFACT_IDS` configuration
   - Review application logs for errors

3. **Performance issues**
   - Adjust `SUMRM_API_TIMEOUT` if needed
   - Consider caching strategies for frequently accessed models

### Debug Mode

Enable debug logging by setting the log level to debug in your application configuration.
