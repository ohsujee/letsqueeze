
== Gathering artifacts ==

== Publishing artifacts ==

Publishing artifact App.ipa
Publishing artifact App.app.dSYM.zip
Publishing artifact AppAuth.framework.dSYM.zip
Publishing artifact Capacitor.framework.dSYM.zip
Publishing artifact CapacitorApp.framework.dSYM.zip
Publishing artifact CapacitorCommunityInAppReview.framework.dSYM.zip
Publishing artifact Cordova.framework.dSYM.zip
Publishing artifact FirebaseAppCheckInterop.framework.dSYM.zip
Publishing artifact FirebaseAuth.framework.dSYM.zip
Publishing artifact FirebaseAuthInterop.framework.dSYM.zip
Publishing artifact FirebaseCore.framework.dSYM.zip
Publishing artifact FirebaseCoreExtension.framework.dSYM.zip
Publishing artifact FirebaseCoreInternal.framework.dSYM.zip
Publishing artifact GTMAppAuth.framework.dSYM.zip
Publishing artifact GTMSessionFetcher.framework.dSYM.zip
Publishing artifact GoogleSignIn.framework.dSYM.zip
Publishing artifact GoogleUtilities.framework.dSYM.zip
Publishing artifact PurchasesHybridCommon.framework.dSYM.zip
Publishing artifact RecaptchaInterop.framework.dSYM.zip
Publishing artifact RevenueCat.framework.dSYM.zip
Publishing artifact RevenuecatPurchasesCapacitor.framework.dSYM.zip
Publishing artifact letsqueeze_41_artifacts.zip
Publishing App.ipa to App Store Connect
> app-store-connect publish --path /Users/builder/clone/ios/App/build/ios/ipa/App.ipa --key-id ******** --issuer-id ******** --private-key @env:APP_STORE_CONNECT_PUBLISHER_PRIVATE_KEY

Publish "/Users/builder/clone/ios/App/build/ios/ipa/App.ipa" to App Store Connect
App name: Gigglz
Bundle identifier: com.gigglz.app
Certificate expires: 2027-02-07T00:07:20.000+0000
Distribution type: App Store
Min OS version: 14.0
Provisioned devices: N/A
Provisions all devices: No
Supported platforms: iPhoneOS
Version code: 13
Version: 1.0.1

Upload "/Users/builder/clone/ios/App/build/ios/ipa/App.ipa" to App Store Connect
Running altool at path '/Applications/Xcode-26.2.app/Contents/SharedFrameworks/ContentDelivery.framework/Resources/altool'...

26.10.1 (171001)
Running altool at path '/Applications/Xcode-26.2.app/Contents/SharedFrameworks/ContentDelivery.framework/Resources/altool'...

2026-02-26 17:42:30.256 ERROR: [ContentDelivery.Uploader.100D7AE10] 
=======================================
UPLOAD FAILED with 2 errors
=======================================
{
  "os-version" : "Version 26.2 (Build 25C56)",
  "product-errors" : [
    {
      "code" : 409,
      "message" : "Validation failed",
      "underlying-errors" : [
        {
          "code" : -19241,
          "message" : "Validation failed",
          "underlying-errors" : [

          ],
          "user-info" : {
            "NSLocalizedDescription" : "Validation failed",
            "NSLocalizedFailureReason" : "Invalid Pre-Release Train. The train version '1.0.1' is closed for new build submissions",
            "code" : "STATE_ERROR.VALIDATION_ERROR",
            "detail" : "Invalid Pre-Release Train. The train version '1.0.1' is closed for new build submissions",
            "id" : "8242bffc-efcd-479e-932c-92584c3f37cf",
            "status" : "409",
            "title" : "Validation failed"
          }
        }
      ],
      "user-info" : {
        "NSLocalizedDescription" : "Validation failed",
        "NSLocalizedFailureReason" : "Invalid Pre-Release Train. The train version '1.0.1' is closed for new build submissions (ID: 8242bffc-efcd-479e-932c-92584c3f37cf)",
        "NSUnderlyingError" : "Error Domain=IrisAPI Code=-19241 \"Validation failed\" UserInfo={status=409, detail=Invalid Pre-Release Train. The train version '1.0.1' is closed for new build submissions, id=8242bffc-efcd-479e-932c-92584c3f37cf, code=STATE_ERROR.VALIDATION_ERROR, title=Validation failed, NSLocalizedFailureReason=Invalid Pre-Release Train. The train version '1.0.1' is closed for new build submissions, NSLocalizedDescription=Validation failed}",
        "iris-code" : "STATE_ERROR.VALIDATION_ERROR"
      }
    },
    {
      "code" : 409,
      "message" : "Validation failed",
      "underlying-errors" : [
        {
          "code" : -19241,
          "message" : "Validation failed",
          "underlying-errors" : [

          ],
          "user-info" : {
            "NSLocalizedDescription" : "Validation failed",
            "NSLocalizedFailureReason" : "This bundle is invalid. The value for key CFBundleShortVersionString [1.0.1] in the Info.plist file must contain a higher version than that of the previously approved version [1.0.1]. Please find more information about CFBundleShortVersionString at https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring",
            "code" : "STATE_ERROR.VALIDATION_ERROR",
            "detail" : "This bundle is invalid. The value for key CFBundleShortVersionString [1.0.1] in the Info.plist file must contain a higher version than that of the previously approved version [1.0.1]. Please find more information about CFBundleShortVersionString at https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring",
            "id" : "a2122791-89a2-4746-b95f-3d17c5e09ef8",
            "status" : "409",
            "title" : "Validation failed"
          }
        }
      ],
      "user-info" : {
        "NSLocalizedDescription" : "Validation failed",
        "NSLocalizedFailureReason" : "This bundle is invalid. The value for key CFBundleShortVersionString [1.0.1] in the Info.plist file must contain a higher version than that of the previously approved version [1.0.1]. Please find more information about CFBundleShortVersionString at https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring (ID: a2122791-89a2-4746-b95f-3d17c5e09ef8)",
        "NSUnderlyingError" : "Error Domain=IrisAPI Code=-19241 \"Validation failed\" UserInfo={status=409, detail=This bundle is invalid. The value for key CFBundleShortVersionString [1.0.1] in the Info.plist file must contain a higher version than that of the previously approved version [1.0.1]. Please find more information about CFBundleShortVersionString at https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring, id=a2122791-89a2-4746-b95f-3d17c5e09ef8, code=STATE_ERROR.VALIDATION_ERROR, title=Validation failed, NSLocalizedFailureReason=This bundle is invalid. The value for key CFBundleShortVersionString [1.0.1] in the Info.plist file must contain a higher version than that of the previously approved version [1.0.1]. Please find more information about CFBundleShortVersionString at https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring, NSLocalizedDescription=Validation failed}",
        "iris-code" : "STATE_ERROR.VALIDATION_ERROR"
      }
    }
  ],
  "tool-path" : "/Applications/Xcode-26.2.app/Contents/SharedFrameworks/ContentDelivery.framework/Resources",
  "tool-version" : "26.10.1 (171001)"
}

Running altool at path '/Applications/Xcode-26.2.app/Contents/SharedFrameworks/ContentDelivery.framework/Resources/altool'...

2026-02-26 17:42:30.256 ERROR: [ContentDelivery.Uploader.100D7AE10] 
=======================================
UPLOAD FAILED with 2 errors
=======================================
{
  "os-version" : "Version 26.2 (Build 25C56)",
  "product-errors" : [
    {
      "code" : 409,
      "message" : "Validation failed",
      "underlying-errors" : [
        {
          "code" : -19241,
          "message" : "Validation failed",
          "underlying-errors" : [

          ],
          "user-info" : {
            "NSLocalizedDescription" : "Validation failed",
            "NSLocalizedFailureReason" : "Invalid Pre-Release Train. The train version '1.0.1' is closed for new build submissions",
            "code" : "STATE_ERROR.VALIDATION_ERROR",
            "detail" : "Invalid Pre-Release Train. The train version '1.0.1' is closed for new build submissions",
            "id" : "8242bffc-efcd-479e-932c-92584c3f37cf",
            "status" : "409",
            "title" : "Validation failed"
          }
        }
      ],
      "user-info" : {
        "NSLocalizedDescription" : "Validation failed",
        "NSLocalizedFailureReason" : "Invalid Pre-Release Train. The train version '1.0.1' is closed for new build submissions (ID: 8242bffc-efcd-479e-932c-92584c3f37cf)",
        "NSUnderlyingError" : "Error Domain=IrisAPI Code=-19241 \"Validation failed\" UserInfo={status=409, detail=Invalid Pre-Release Train. The train version '1.0.1' is closed for new build submissions, id=8242bffc-efcd-479e-932c-92584c3f37cf, code=STATE_ERROR.VALIDATION_ERROR, title=Validation failed, NSLocalizedFailureReason=Invalid Pre-Release Train. The train version '1.0.1' is closed for new build submissions, NSLocalizedDescription=Validation failed}",
        "iris-code" : "STATE_ERROR.VALIDATION_ERROR"
      }
    },
    {
      "code" : 409,
      "message" : "Validation failed",
      "underlying-errors" : [
        {
          "code" : -19241,
          "message" : "Validation failed",
          "underlying-errors" : [

          ],
          "user-info" : {
            "NSLocalizedDescription" : "Validation failed",
            "NSLocalizedFailureReason" : "This bundle is invalid. The value for key CFBundleShortVersionString [1.0.1] in the Info.plist file must contain a higher version than that of the previously approved version [1.0.1]. Please find more information about CFBundleShortVersionString at https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring",
            "code" : "STATE_ERROR.VALIDATION_ERROR",
            "detail" : "This bundle is invalid. The value for key CFBundleShortVersionString [1.0.1] in the Info.plist file must contain a higher version than that of the previously approved version [1.0.1]. Please find more information about CFBundleShortVersionString at https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring",
            "id" : "a2122791-89a2-4746-b95f-3d17c5e09ef8",
            "status" : "409",
            "title" : "Validation failed"
          }
        }
      ],
      "user-info" : {
        "NSLocalizedDescription" : "Validation failed",
        "NSLocalizedFailureReason" : "This bundle is invalid. The value for key CFBundleShortVersionString [1.0.1] in the Info.plist file must contain a higher version than that of the previously approved version [1.0.1]. Please find more information about CFBundleShortVersionString at https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring (ID: a2122791-89a2-4746-b95f-3d17c5e09ef8)",
        "NSUnderlyingError" : "Error Domain=IrisAPI Code=-19241 \"Validation failed\" UserInfo={status=409, detail=This bundle is invalid. The value for key CFBundleShortVersionString [1.0.1] in the Info.plist file must contain a higher version than that of the previously approved version [1.0.1]. Please find more information about CFBundleShortVersionString at https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring, id=a2122791-89a2-4746-b95f-3d17c5e09ef8, code=STATE_ERROR.VALIDATION_ERROR, title=Validation failed, NSLocalizedFailureReason=This bundle is invalid. The value for key CFBundleShortVersionString [1.0.1] in the Info.plist file must contain a higher version than that of the previously approved version [1.0.1]. Please find more information about CFBundleShortVersionString at https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring, NSLocalizedDescription=Validation failed}",
        "iris-code" : "STATE_ERROR.VALIDATION_ERROR"
      }
    }
  ],
  "tool-path" : "/Applications/Xcode-26.2.app/Contents/SharedFrameworks/ContentDelivery.framework/Resources",
  "tool-version" : "26.10.1 (171001)"
}

Failed to upload archive at "/Users/builder/clone/ios/App/build/ios/ipa/App.ipa":
Validation failed
Validation failed
Failed to publish /Users/builder/clone/ios/App/build/ios/ipa/App.ipa

Failed to publish App.ipa to App Store Connect.

Build failed :|


Publishing failed :|
Failed to publish App.ipa to App Store Connect.

