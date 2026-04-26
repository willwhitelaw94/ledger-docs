---
title: "Google Services"
description: "Google Maps, reCAPTCHA, and other Google integrations"
---

We integrate several Google services into TC Portal for mapping, security, and analytics.

---

## Google Maps

Used for location-based features and address validation.

| Feature | Usage |
|---------|-------|
| **Maps Embed** | Displaying supplier and service locations |
| **Places API** | Address autocomplete and validation |
| **Geocoding** | Converting addresses to coordinates |

---

## Google reCAPTCHA

Protects forms from spam and bot submissions.

| Version | Usage |
|---------|-------|
| **reCAPTCHA v3** | Invisible scoring for forms |
| **reCAPTCHA v2** | Checkbox verification where needed |

---

## Google Analytics (GA4)

Used for website analytics and user behaviour tracking.

| Feature | Usage |
|---------|-------|
| **Page Views** | Traffic and engagement |
| **Events** | Custom event tracking |
| **Conversions** | Goal tracking |

---

## Configuration

API keys are managed through environment variables:

```env
GOOGLE_MAPS_API_KEY=your_key
GOOGLE_RECAPTCHA_SITE_KEY=your_key
GOOGLE_RECAPTCHA_SECRET_KEY=your_secret
```

---

## Resources

- [Google Maps Platform](https://developers.google.com/maps)
- [reCAPTCHA Documentation](https://developers.google.com/recaptcha)
- [Google Analytics](https://analytics.google.com/)
