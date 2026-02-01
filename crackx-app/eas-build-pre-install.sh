#!/bin/bash

# EAS Build Pre-Install Hook
# This script runs before the build to configure gradle.properties for optimization

echo "🔧 Configuring Gradle for optimized build..."

# Add optimization flags to gradle.properties
cat >> android/gradle.properties << EOF

# APK Optimization Settings (Added by EAS build hook)
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
android.enablePngCrunchInReleaseBuilds=true
EOF

echo "✅ Gradle optimization configured!"
