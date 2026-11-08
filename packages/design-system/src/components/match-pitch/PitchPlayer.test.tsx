import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PitchPlayer, type PitchPlayerData, pitchPlayerSentence, pitchRingArc } from './PitchPlayer'

const visser: PitchPlayerData = {
  captain: true,
  card: { kind: 'yellow-card', minute: 27 },
  goals: [{ minute: 12 }],
  minutesPlayed: 62,
  name: { givenName: 'Bram', surname: 'Visser' },
  shirtNumber: 1,
  substitutedOffAt: 62,
}

const arcOf = (container: HTMLElement) => {
  const ring = container.querySelector<HTMLElement>('.hf-pitch-player-ring')

  return {
    length: ring?.style.getPropertyValue('--hf-ring-length'),
    start: ring?.style.getPropertyValue('--hf-ring-start'),
  }
}

describe('pitchPlayerSentence', () => {
  it('says every mark in words, in the order of the match', () => {
    expect(pitchPlayerSentence(visser)).toBe(
      "Bram Visser, rugnummer 1, aanvoerder, doelpunt 12', gele kaart 27', eruit 62', 62 minuten",
    )
  })

  it('has his name and no word about the number for a player without a shirt number', () => {
    const sentence = pitchPlayerSentence({ ...visser, shirtNumber: null })

    expect(sentence).toBe("Bram Visser, aanvoerder, doelpunt 12', gele kaart 27', eruit 62', 62 minuten")
    expect(sentence).not.toMatch(/rugnummer|null|leeg/)
  })

  it('names own goals, added time and the other cards', () => {
    const sentence = pitchPlayerSentence({
      card: { kind: 'yellow-red-card', minute: 45, stoppageMinutes: 2 },
      goals: [{ minute: 90, ownGoal: true, stoppageMinutes: 3 }, { minute: 12 }],
      minutesPlayed: 1,
      name: { surname: 'Dummy' },
      shirtNumber: 4,
    })

    expect(sentence).toBe("Dummy, rugnummer 4, eigen doelpunt 90+3', doelpunt 12', geel-rode kaart 45+2', 1 minuut")
    expect(
      pitchPlayerSentence({
        card: { kind: 'red-card', minute: 80 },
        minutesPlayed: 80,
        name: { surname: 'X' },
        shirtNumber: 2,
      }),
    ).toContain("rode kaart 80'")
  })

  it('names a goal and a card without a minute, and says nothing about the minute', () => {
    const sentence = pitchPlayerSentence({
      card: { kind: 'yellow-card', minute: null },
      goals: [{ minute: null }, { minute: null, ownGoal: true }],
      minutesPlayed: 90,
      name: { givenName: 'Rick', surname: 'Demo' },
      shirtNumber: 9,
    })

    expect(sentence).toBe('Rick Demo, rugnummer 9, doelpunt, eigen doelpunt, gele kaart, 90 minuten')
    expect(sentence).not.toMatch(/null|leeg|0'/u)
  })

  it('leaves out what did not happen', () => {
    expect(
      pitchPlayerSentence({ minutesPlayed: 90, name: { givenName: 'Rick', surname: 'Demo' }, shirtNumber: 9 }),
    ).toBe('Rick Demo, rugnummer 9, 90 minuten')
  })
})

describe('pitchRingArc', () => {
  it('runs all the way round for a whole match', () => {
    expect(pitchRingArc({ ...visser, minutesFrom: 0, minutesPlayed: 90 }, false)).toEqual({ length: 360, start: 0 })
  })

  it('starts at the minute he came on', () => {
    // On at 60, played 30 of 90 minutes: starts at 240 degrees and covers a third.
    expect(pitchRingArc({ ...visser, minutesFrom: 60, minutesPlayed: 30 }, false)).toEqual({ length: 120, start: 240 })
  })

  it('stops at a red card: fewer minutes make a shorter arc', () => {
    expect(
      pitchRingArc({ ...visser, card: { kind: 'red-card', minute: 45 }, minutesFrom: 0, minutesPlayed: 45 }, false),
    ).toEqual({
      length: 180,
      start: 0,
    })
  })

  it('runs to 120 minutes in extra time', () => {
    expect(pitchRingArc({ ...visser, minutesFrom: 90, minutesPlayed: 30 }, true)).toEqual({ length: 90, start: 270 })
    expect(pitchRingArc({ ...visser, minutesFrom: 0, minutesPlayed: 120 }, true)).toEqual({ length: 360, start: 0 })
  })

  it('never goes past the end of the match', () => {
    expect(pitchRingArc({ ...visser, minutesFrom: 80, minutesPlayed: 90 }, false)).toEqual({ length: 40, start: 320 })
  })
})

describe('PitchPlayer', () => {
  it('is one list item with one sentence, and hides the drawing from a screen reader', () => {
    const { container } = render(
      <ol>
        <PitchPlayer {...visser} ours />
      </ol>,
    )
    const item = container.querySelector('li')

    expect(item?.querySelector('.hf-visually-hidden')?.textContent).toBe(pitchPlayerSentence(visser))
    expect(item?.querySelector('.hf-pitch-player-drawing')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('draws the number, the surname and "eruit" under it, and the marks', () => {
    const { container } = render(
      <ol>
        <PitchPlayer {...visser} ours />
      </ol>,
    )

    expect(container.querySelector('.hf-pitch-player-number')?.textContent).toContain('1')
    expect(container.querySelector('.hf-pitch-player-surname')?.textContent).toBe('Visser')
    expect(container.querySelector('.hf-pitch-player-off')?.textContent).toBe("eruit 62'")
    expect(container.querySelector('.hf-pitch-player-mark-goal')).not.toBeNull()
    expect(container.querySelector('.hf-pitch-player-mark-card')).not.toBeNull()
    expect(container.querySelector('.hf-pitch-player-mark-out')).not.toBeNull()
    expect(container.querySelector('.hf-pitch-player-mark-captain')?.textContent).toBe('A')
  })

  it('draws the same disc without a figure for a player without a shirt number', () => {
    const { container } = render(
      <ol>
        <PitchPlayer {...visser} ours shirtNumber={null} />
      </ol>,
    )

    expect(container.querySelector('.hf-pitch-player-number')?.textContent).toBe('')
    expect(container.querySelector('.hf-pitch-player-surname')?.textContent).toBe('Visser')
    expect(container.querySelector('.hf-pitch-player-disc-ours')).not.toBeNull()
    expect(container.textContent).not.toContain('null')
  })

  it('has no marks for a player who did nothing', () => {
    const { container } = render(
      <ol>
        <PitchPlayer minutesPlayed={90} name={{ surname: 'Demo' }} ours={false} shirtNumber={3} />
      </ol>,
    )

    expect(container.querySelector('.hf-pitch-player-mark')).toBeNull()
    expect(container.querySelector('.hf-pitch-player-off')).toBeNull()
  })

  it('makes the goal mark red only when every goal was an own goal', () => {
    const own = render(
      <ol>
        <PitchPlayer {...visser} goals={[{ minute: 5, ownGoal: true }]} ours />
      </ol>,
    )
    const mixed = render(
      <ol>
        <PitchPlayer {...visser} goals={[{ minute: 5, ownGoal: true }, { minute: 50 }]} ours />
      </ol>,
    )

    expect(own.container.querySelector('.hf-pitch-player-mark-goal .hf-match-event-icon-own')).not.toBeNull()
    expect(mixed.container.querySelector('.hf-pitch-player-mark-goal .hf-match-event-icon-own')).toBeNull()
  })

  it('shows the heaviest card he got', () => {
    const { container } = render(
      <ol>
        <PitchPlayer {...visser} card={{ kind: 'yellow-red-card', minute: 80 }} ours />
      </ol>,
    )

    expect(container.querySelector('.hf-pitch-player-mark-card .hf-match-event-icon-red')).not.toBeNull()
    expect(container.querySelector('.hf-pitch-player-mark-card .hf-match-event-icon-yellow')).not.toBeNull()
  })

  it('draws the ring from the minute he came on, and shorter after a red card', () => {
    const subbedOn = render(
      <ol>
        <PitchPlayer minutesFrom={62} minutesPlayed={28} name={{ surname: 'Nepper' }} ours shirtNumber={14} />
      </ol>,
    )
    const sentOff = render(
      <ol>
        <PitchPlayer
          card={{ kind: 'red-card', minute: 45 }}
          minutesPlayed={45}
          name={{ surname: 'Dummy' }}
          ours
          shirtNumber={4}
        />
      </ol>,
    )

    expect(arcOf(subbedOn.container)).toEqual({ length: '112deg', start: '248deg' })
    expect(arcOf(sentOff.container)).toEqual({ length: '180deg', start: '0deg' })
  })

  it('fills the disc for sc Heerenveen and leaves it open for the opponent', () => {
    const { container } = render(
      <ol>
        <PitchPlayer {...visser} ours />
        <PitchPlayer {...visser} ours={false} />
      </ol>,
    )

    expect(container.querySelector('.hf-pitch-player-ours')).not.toBeNull()
    expect(container.querySelector('.hf-pitch-player-theirs')).not.toBeNull()
  })

  it('shows the given name when a player has no surname', () => {
    const { container } = render(
      <ol>
        <PitchPlayer minutesPlayed={90} name={{ givenName: 'Okke', surname: '' }} ours shirtNumber={9} />
      </ol>,
    )

    expect(container.querySelector('.hf-pitch-player-surname')?.textContent).toBe('Okke')
  })
})
