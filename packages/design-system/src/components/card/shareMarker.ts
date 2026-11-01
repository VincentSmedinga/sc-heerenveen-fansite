/**
 * The attribute of a part of a card that the image of the card leaves out: the button and its
 * message, and the line that says when the data last changed (the image has the day it was made
 * and the source under it). Its own file, because `CardShare` is a client component and a
 * server component can't take a plain value from one.
 */
export const shareMarker = 'data-hf-card-share'
