# AdmiralCloud ac-poc-bookshelf
This is a proof-of-concept that ingests ISBN, requests them at some ISBN database and then creates mediacontainers (including metadata and image) based on the response.

This way you can catalogue your bookshelf

# Usage
Clone, run ***yarn install***, copy config/config.js to config/env/development.js and update it there. Then start the app using node index.js. Enter ISBN using keyboard or even better a barcode scanner. 


## AC API
Create a new application and create access keys for this new app. Add those values as environment variables to your Lambda function
+ accessKey
+ accessSecret
+ clientId

Adjust the app and allow the following routes
```
{
   "allowedControllerActions":[
       {
         "controller":"mediacontainer",
         "actions":[
            "create",
         ]
      },
      {
         "controller":"media",
         "actions":[
            "create",
            "upload"
         ]
      },
            {
         "controller":"metadata",
         "actions":[
            "create"
         ]
      }
   ]
}
```

## Links
- [Website](https://www.admiralcloud.com/)
- [Twitter (@admiralcloud)](https://twitter.com/admiralcloud)
- [Facebook](https://www.facebook.com/MediaAssetManagement/)


## License
[MIT License](https://opensource.org/licenses/MIT) Copyright © 2009-present, AdmiralCloud, Mark Poepping
