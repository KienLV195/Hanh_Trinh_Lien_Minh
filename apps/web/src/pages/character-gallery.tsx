import { CHARACTERS } from "@htlm/game-domain";
import { CharacterCard } from "../components/character-card";
import { StorybookShell } from "../components/storybook-shell";

export function CharacterGallery() {
  return (
    <StorybookShell mode="gallery" title="Character Gallery" subtitle="Bảy người đồng hành · Một thế giới chung"
      actions={<span className="storybook__room">Xưởng nhân vật</span>}>
      <section className="storybook-lineup" aria-label="Bảy nhân vật trên cùng đường chân">
        {CHARACTERS.map((character) => <CharacterCard character={character} key={character.id} />)}
      </section>
      <section className="gallery-notes" aria-label="Thông tin thiết kế nhân vật">
        {CHARACTERS.map((character) => <article key={character.id}>
          <h2>{character.name} <small>{character.accent}</small></h2>
          <p>{character.shortDescription}</p>
          <span>Sân nhà · Chặng {character.homeLevelId.replace("level-", "")}</span>
        </article>)}
      </section>
    </StorybookShell>
  );
}
