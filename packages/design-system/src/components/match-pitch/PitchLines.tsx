/**
 * The lines on the grass of a pitch: the halfway line, the centre circle, and a penalty area
 * and a goal area for each end that is asked for. `MatchPitch` draws both ends and
 * `PitchSketch` one, so the two pitches are drawn the same way. match-pitch.css gives the
 * lines their look and their place; the field around them hides them from a screen reader or
 * leaves that to the list on it.
 */
export const PitchLines = ({ ends }: { ends: readonly ('first' | 'second')[] }) => (
  <>
    <span className="hf-match-pitch-line hf-match-pitch-line-half" />
    <span className="hf-match-pitch-line hf-match-pitch-line-circle" />
    {['penalty-area', 'goal-area'].flatMap((area) =>
      ends.map((end) => (
        <span
          className={`hf-match-pitch-line hf-match-pitch-line-${area} hf-match-pitch-line-${end}`}
          key={`${area}-${end}`}
        />
      )),
    )}
  </>
)
