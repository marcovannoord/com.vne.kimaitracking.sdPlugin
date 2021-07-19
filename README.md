`KimaiTracking` is a plugin that connects to your locally-hosted instance of  [Kimai v1](https://github.com/kimai/kimai).


# Description

`KimaiTracking`  is a Stream Deck plugin that connects to your favourite time-tracking plugin, and allows you to display the currently tracked task. It also allows you to start and stop the most recent task by long-pressing the button on your stream deck. 


# Features

- code written in Javascript
- cross-platform (macOS, Windows)
- Property Inspector with multiple UI elements
- localized

![](screenshot.png)


# Installation

In the Release folder, you can find the file `com.vne.kimaitracking`. If you double-click this file on your machine, Stream Deck will install the plugin.  
In the settings menu in Stream deck, make sure you set the URL of your kimai instance, for example `https://time.yourdomain.com`. Make sure the domain does not end in a slash `/`  
You also need to supply an API-key to your kimai-user. This can be done using Postman, where you need to do an API POST call to `https://time.yourdomain.com/core/json.php` with in the body:
```
{
  "method": "authenticate",
  "params": [
    "yourusername",
    "yourpassword"
  ],
  "id": "1",
  "jsonrpc": "2.0"
}
```


# Source code

The current folder contains the sourcecode of this plugin

# Building
From the current directory, run:
`DistributionTool.exe -b -i C:\Users\USERNAME\AppData\Roaming\Elgato\StreamDeck\Plugins\com.vne.kimaitracking.sdPlugin -o Release`