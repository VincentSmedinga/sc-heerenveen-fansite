import { Card, Heading, List, Text } from '@fansite/design-system'

/**
 * What an editor may write in the text of an article, with an example of each part (see
 * `src/article-text.ts` for the format itself). It is a card above the form, so the editor
 * reads it before typing.
 */
export function FormatHelp() {
  return (
    <Card aria-labelledby="opmaak-kop" surface="soft">
      <Heading id="opmaak-kop" level={2}>
        Zo schrijf je de tekst
      </Heading>
      <Text>
        De tekst heeft een kleine opmaak. Wat hier niet staat, blijft gewone tekst, ook HTML en afbeeldingen. Kijk met
        “Voorbeeld” hoe het artikel eruitziet voor je het publiceert.
      </Text>
      <List>
        <List.Item>Een nieuwe alinea begin je na een lege regel.</List.Item>
        <List.Item>Een kopje is een regel die begint met twee hekjes en een spatie: “## Wie zijn wij”.</List.Item>
        <List.Item>Een lijst is een rij regels die elk beginnen met een streepje en een spatie: “- Nieuws”.</List.Item>
        <List.Item>Vet zet je tussen twee keer twee sterretjes: “**dit is vet**”.</List.Item>
        <List.Item>Cursief zet je tussen één sterretje: “*dit is cursief*”.</List.Item>
        <List.Item>
          Een link schrijf je als tekst tussen blokhaken, direct gevolgd door het adres tussen haakjes: “[ons
          nieuws](/)” of “[de Leeuwarder Courant](https://www.lc.nl)”. Het adres begint met https:// of met een schuine
          streep.
        </List.Item>
      </List>
      <Text>Noem wat je van anderen overneemt altijd met de bron en een link. Foto’s kunnen hier nog niet.</Text>
    </Card>
  )
}
