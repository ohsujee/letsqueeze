Hello,

Thank you for your resubmission. Upon further review, we identified additional issues that need your attention. See below for more information.

If you have any questions, we are here to help. Reply to this message in App Store Connect and let us know.

Review Environment
Submission ID: 630f6bfa-89ea-40e0-bdd8-cdb4f740e0a6
Review date: February 14, 2026
Review Device: iPad Air 11-inch (M3)
Version reviewed: 1.0


Guideline 2.1 - Performance - App Completeness

We are still unable to complete the review of the app because one or more of the in-app purchase products have not been submitted for review.

Specifically, the app includes references to Passer Pro but the associated in-app purchase products have not been submitted for review. 


Next Steps

To resolve this issue, please be sure to take action and submit your in-app purchases and upload a new binary in App Store Connect so we can proceed with our review. 

Note you must provide an App Review screenshot in App Store Connect in order to submit in-app purchases for review. Learn more about required in-app purchase metadata.


Guideline 2.1 - Information Needed

The app uses the AppTrackingTransparency framework, but we are unable to locate the App Tracking Transparency permission request when reviewed on iPadOS 26.3.

Next Steps

Explain where we can find the App Tracking Transparency permission request in the app. The request should appear before any data is collected that could be used to track the user.

If App Tracking Transparency is implemented but the permission request is not appearing on devices running the latest operating system, review the available documentation and confirm App Tracking Transparency has been correctly implemented.

If your app does not track users, update your app privacy information in App Store Connect to not declare tracking. You must have the Account Holder or Admin role to update app privacy information.

Resources 

- Tracking is linking data collected from the app with third-party data for advertising purposes, or sharing the collected data with a data broker. Learn more about tracking. 
- See Frequently Asked Questions about the requirements for apps that track users.
- Review developer documentation for App Tracking Transparency.


Guideline 3.1.2 - Business - Payments - Subscriptions
Issue Description

The submission did not include all the required information for apps offering auto-renewable subscriptions.

The following information needs to be included within the app:

- A functional link to the Terms of Use (EULA)
- A functional link to the privacy policy

You can use SubscriptionStoreView to easily include all of the required information in the app's purchase flow.

Next Steps

Update the app to include the information specified above.

Resources

Apps offering auto-renewable subscriptions must include all of the following required information in the app itself:

- Title of auto-renewing subscription (this may be the same as the in-app purchase product name)
- Length of subscription
- Price of subscription, and price per unit if appropriate
- Functional links to the privacy policy and Terms of Use (EULA)

The app metadata must also include functional links to the privacy policy in the Privacy Policy field in App Store Connect and the Terms of Use (EULA) in the App Description or EULA field in App Store Connect.

Review Schedule 2 of the Apple Developer Program License Agreement to learn more.


Guideline 3.1.2 - Business - Payments - Subscriptions

One or more auto-renewable subscriptions are marketed in the purchase flow in a way that may mislead or confuse users about the subscription terms or pricing. Specifically:

- The billed amount of the auto-renewable subscription is not clearly and conspicuously displayed to the customer.

Next Steps

To resolve this issue, it would be appropriate to:

- Revise the auto-renewable subscription purchase flow to ensure that the billed amount is the most clear and conspicuous pricing element in the layout. Any other pricing elements, including free trial, introductory pricing, and calculated pricing information, must be displayed in a subordinate position and size to the total billed amount. Factors that contribute to whether the billed amount is clear and conspicuous include, but are not limited to, the font, size, color, and location of the billed amount in the auto-renewable subscription purchase flow.

Resources

See design guidance for auto-renewable subscriptions in the Human Interface Guidelines, including how to create a positive onboarding experience.
Learn more about offering auto-renewable subscriptions in your app.


Support

- Reply to this message in your preferred language if you need assistance. If you need additional support, use the Contact Us module.
- Consult with fellow developers and Apple engineers on the Apple Developer Forums.
- Provide feedback on this message and your review experience by completing a short survey.
