# Blind Nine

An HTML/JS-based two-player game played locally.

## Board

Each player's cards need to be hidden from each other so we will assume a physical barrier separating each player area will be installed.
There should be enough margin for the barrier.
And then there is a common play area that needs to be duplicated (with convenient differences) on each side of the barrier.
The entire board should always fit the displayed area without scrolling.
The screen may be split side-by-side horizontally or end-to-end with opposite orientations, facing outwards.
Each player area's bottom shows a row of unplayed cards in ascending order.
The top shows the play area: two rows of played cards, the opponent's above and the player's below.
Below is a small margin for showing the result of each round.
Above shows each player's current score.
All three rows consist of 9 slots, and no movement is needed within the row.
The unplayed cards are first sorted in ascending order, then moved to the common play area upon player's choice one by one from left to right in the play area.
The remaining cards don't move.
Between the results margin and the unplayed cards is space for instructions.
Extra space on the unused axis goes to margins above the play area and below the unplayed cards.
The board scales uniformly to fit the displayed area.
The numbers on the face and labels on the back of the cards are red or blue, depending on the player.
The board and both the face and back of the cards are all white or black, depending on the theme.
The cards' outline and other text should be of the opposite color.
The exact hue of any color should be aesthetically pleasing ones.

## Options

Each player area's top right shows a gear icon, the button for options.
The option panel is also duplicated to both players, with the settings synced when both opened.
Any player can set the options, which are applied to both players mid-game.
The settings should persist via local storage.
There are five options and a Close button at the bottom.

- Theme: Automatic (default), Light, or Dark
- Board Split (radio): Side-by-Side (default) or End-to-End
- 1 Beats 9 (checkbox, checked by default)
- Show My Played Cards (checkbox, unchecked by default)
- Keep Round Results Shown (checkbox, checked by default)

To the left of the gear icon is a question mark, which shows the rules (to both players) specified below.
Each player area's top left shows a New Game button, which prompts a check (Start over? Yes / No) before starting over.
At the start of each game, a panel on each player's side shows Who goes first? Red / Blue / Random.

## Rules

Place a physical barrier in the middle in order to obscure each player's card from the opponent.
The game consists of at most 9 rounds.
The first to win 5 rounds, or more rounds after the final round, wins the game.
At the beginning each player is given number cards 1~9 at the bottom, hidden from the opponent due to the barrier.
The backs are labeled "EVEN" or "odd" (different cases) depending on the number, informing the opponent.
At each round, each player in turn plays a single unplayed card to the corresponding round in the play area face down.
(The card may be face up only to the player depending on the option.)
The card with the greater number wins, but by exception 1 beats 9 (unless the option is disabled).
The game declares the winner of each round, but the opponent's cards remain hidden until the end of the game.
The winner of the previous round plays first in the next round.
In case of a tie, the previous first player plays first.

## Playing a Card

While waiting for the opponent to play, the instruction says "Waiting for [color] to play..."
When playing a card, the instruction says "Select a card to play."
When a card is selected, check for confirmation showing "Play [number]?" with Yes / No.
Instead of the two options, another card may be selected instead at this point, modifying the prompt.
Confirmation can be skipped by double-pressing the card.
Only when Yes is pressed should the card move to the play area, face up or down according to Show My Played Cards.
For the opponent, the card just shows up face down.
Then there should be a 3-second countdown, with the instructions showing "3", "2", "1".
At the end of the countdown the result is revealed as "WIN", "LOSE", or "DRAW" in a large font in the instructions area for 3 seconds.
If Keep Round Results Shown is checked, the same result is also shown under the round's cards until the end of the game.
Otherwise, the same slot simply shows "Done" in gray.
When the winner of the game is determined, the instructions show "You WIN/LOSE the game!"
If no one wins after the final round, show "The game is a DRAW!"
In both cases the opponent's played cards are revealed, at which point only the New Game button can be pressed.