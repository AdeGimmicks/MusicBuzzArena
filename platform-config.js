/* ===================================================
   PLATFORM LINK CONFIGURATION

   CODE OWNER GUIDE

   Defines the social media and streaming platform fields used across upload forms and public pages.
   Used by: artist dashboard and public release pages.
   Does not save data by itself.
=================================================== */

/* ===================================================
   SOCIAL MEDIA LINK DEFINITIONS

   Controls the list of social platforms artists can add
   to their public profile.

   Used by:
   • Artist Dashboard profile form
   • Public artist home/profile pages

   Adding a new row here makes that social platform available
   where the website builds social link fields.
=================================================== */
const SOCIAL_LINKS = [
  ["Instagram", "instagram", "Social media icon/Instagram_logo_2016.svg.png"],
  ["Facebook", "facebook", "Social media icon/Facebook_f_logo_(2021).svg.png"],
  ["X", "x", "Social media icon/twitter-x-logo-png_seeklogo-492397.png"],
  ["YouTube", "youtube", "Social media icon/youtube-icon-lg.png"],
  ["TikTok", "tiktok", "Social media icon/tiktok-logo-tikok-icon-transparent-tikok-app-logo-free-png.webp"],
  ["Spotify", "spotify", "https://cdn.simpleicons.org/spotify/11141B"],
  ["Audiomack", "audiomack", "Music Platforms Logo/audiomack logo.png"],
  ["SoundCloud", "soundcloud", "Music Platforms Logo/soundcloud - Logo .webp"],
  ["Threads", "threads", "https://cdn.simpleicons.org/threads/11141B"],
  ["LinkedIn", "linkedin", "https://cdn.simpleicons.org/linkedin/11141B"],
  ["Snapchat", "snapchat", "https://cdn.simpleicons.org/snapchat/11141B"],
  ["WhatsApp", "whatsapp", "https://cdn.simpleicons.org/whatsapp/11141B"],
  ["Telegram", "telegram", "https://cdn.simpleicons.org/telegram/11141B"],
  ["Email", "email", "https://cdn.simpleicons.org/maildotru/11141B"],
  ["Website", "website", ""],
];

/* ===================================================
   STREAMING PLATFORM LINK DEFINITIONS

   Controls the list of streaming platforms that appear in
   upload forms and public listen/music pages.

   Used by:
   • Upload Wizard streaming step
   • Listen page
   • Music page streaming platform buttons

   This file only defines labels, field names, and icons.
   Click tracking and saving happen in other files.
=================================================== */
const STREAMING_LINKS = [
  ["Spotify", "spotify", "Music Platforms Logo/Spotify_App_Logo.svg.png"],
  ["Apple Music", "appleMusic", "Music Platforms Logo/Apple_Music_icon.svg.png"],
  ["YouTube Music", "youtubeMusic", "Music Platforms Logo/Youtube_Music_icon.svg.png"],
  ["Audiomack", "audiomack", "Music Platforms Logo/audiomack logo.png"],
  ["SoundCloud", "soundcloud", "Music Platforms Logo/soundcloud - Logo .webp"],
  ["Deezer", "deezer", "Music Platforms Logo/Deezer_Logo.jpg"],
  ["iTunes", "itunes", "Music Platforms Logo/itunes-logo-png-transparent.png"],
  ["TIDAL", "tidal", "Music Platforms Logo/tidal-logo-rounded-hd-free-png.webp"],
  ["Amazon Music", "amazonMusic", "Music Platforms Logo/amazon-music-logo-rounded-hd-free-png.webp"],
  ["Pandora", "pandora", "Music Platforms Logo/431-4316215_pandora-music-blue-logo-pandora-music-logo-png.png"],
  ["iHeartRadio", "iHeartRadio", "Music Platforms Logo/iHeartzRadio Logo.webp"],
];
