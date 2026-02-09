
Using Xcode 26.2 (17C52)
Check App.xcworkspace build settings
Execute "xcodebuild -workspace App.xcworkspace -scheme App -showBuildSettings"

Archive App.xcworkspace
Execute "xcodebuild -workspace App.xcworkspace -scheme App -archivePath /Users/builder/clone/ios/App/build/ios/xcarchive/App_prxsfohk.xcarchive archive COMPILER_INDEX_STORE_ENABLE=NO DEVELOPMENT_TEAM=CSS99WK76U 'CODE_SIGN_IDENTITY=Apple Distribution' CODE_SIGN_STYLE=Manual"

Using Xcode 26.2 (17C52)
Check App.xcworkspace build settings
Execute "xcodebuild -workspace App.xcworkspace -scheme App -showBuildSettings"

Archive App.xcworkspace
Execute "xcodebuild -workspace App.xcworkspace -scheme App -archivePath /Users/builder/clone/ios/App/build/ios/xcarchive/App_prxsfohk.xcarchive archive COMPILER_INDEX_STORE_ENABLE=NO DEVELOPMENT_TEAM=CSS99WK76U 'CODE_SIGN_IDENTITY=Apple Distribution' CODE_SIGN_STYLE=Manual"

    Run script build phase '[CP] Copy XCFrameworks' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'GoogleUserMessagingPlatform' from project 'Pods')
    Run script build phase '[CP] Copy Pods Resources' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'App' from project 'App')
    Run script build phase '[CP] Embed Pods Frameworks' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'App' from project 'App')
    Run script build phase '[CP] Copy XCFrameworks' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'Google-Mobile-Ads-SDK' from project 'Pods')
Failed to archive App.xcworkspace


Build failed :|
Step 10 script `Build ipa for distribution` exited with status code 65
    Run script build phase '[CP] Copy XCFrameworks' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'GoogleUserMessagingPlatform' from project 'Pods')
    Run script build phase '[CP] Copy Pods Resources' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'App' from project 'App')
    Run script build phase '[CP] Embed Pods Frameworks' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'App' from project 'App')
    Run script build phase '[CP] Copy XCFrameworks' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'Google-Mobile-Ads-SDK' from project 'Pods')
Failed to archive App.xcworkspace


Build failed :|
Step 10 script `Build ipa for distribution` exited with status code 65