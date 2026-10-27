/**
 * The tones the parts of a chart can have: `positive` is the colour of something good,
 * `negative` of something bad and `neutral` of something in between. The page decides which
 * of its numbers is which; a chart knows nothing about what a tone means. chart.css gives each
 * tone its colour and its strength.
 */
export const chartTones = ['positive', 'neutral', 'negative'] as const

export type ChartTone = (typeof chartTones)[number]
