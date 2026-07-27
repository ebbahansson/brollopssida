README — Uppdatera texter och flerspråk (i18n)

Syfte
- Beskriver hur du uppdaterar sidtexter utan att orsaka inkonsekvenser mellan HTML och JavaScript.

Var ligger texterna
- Synlig text som använder översättning styrs från objektet `translations` i filen: [script.js](script.js#L816-L830)
  - Svenska finns i `translations.sv`.
  - Engelska finns i `translations.en`.
- HTML-element visar översättningar via attributet `data-i18n` i respektive sida (t.ex. [page2.html](page2.html)).

Vanliga `data-i18n`-nycklar på sidan `Resa och boende` (page2)
- `page2-hero-title`
- `page2-transport-title`
- `page2-transport-text`
- `page2-accommodation-title`
- `page2-accommodation-text`

Hur du uppdaterar en text (säkert)
1. Öppna `script.js` och hitta objektet `translations.sv` för svenska (och `translations.en` för engelska).
2. Hitta rätt nyckel (t.ex. `page2-transport-text`) och ändra värdet i respektive språkblock.
   Exempel:
   ```js
   // i translations.sv
   'page2-transport-text': 'Vi kommer hålla till i Kigali...',
   ```
3. Spara filen.
4. I webbläsaren: ta bort den eventuella språkinställningen från localStorage (om du vill tvinga ny laddning):
   ```js
   localStorage.removeItem('siteLanguage'); location.reload();
   ```
   Alternativt, sätt språket direkt och ladda om:
   ```js
   localStorage.setItem('siteLanguage','sv'); location.reload();
   ```

Viktiga riktlinjer
- Uppdatera endast i `script.js` för element som använder `data-i18n`. Om du skriver text direkt i HTML för ett element som också har `data-i18n`, kommer `translatePage()` att skriva över HTML-texten när sidan laddas eller språket byts.
- För alt-texter eller andra attribut som inte styrs av `data-i18n`, redigera HTML-filen direkt (t.ex. [page2.html](page2.html)).
- Håll nycklar korta och konsekventa. Lägg till nya nycklar i både `sv` och `en` samtidigt för att undvika tomma värden.

Tips: snabb kontroll efter ändring
- Ladda om sidan.
- Klicka språkknappen (top-menyn) för att byta språk och verifiera att både `sv` och `en` visar förväntad text.

Behöver du hjälp att bulk-uppdatera flera nycklar eller vill ha en liten script-snutt som visar alla `page2`-nycklar i terminalen? Säg till så skapar jag den.
