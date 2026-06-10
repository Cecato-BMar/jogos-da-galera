import { GameType } from '@/types';

export const games: Array<{
  type: GameType;
  name: string;
  shortName: string;
  description: string;
}> = [
  {
    type: 'STOP',
    name: 'Stop Online',
    shortName: 'Stop',
    description: 'Categorias, letra sorteada e respostas em tempo real.',
  },
  {
    type: 'HANGMAN',
    name: 'Forca Online',
    shortName: 'Forca',
    description: 'A galera tenta descobrir a palavra antes dos erros acabarem.',
  },
  {
    type: 'TICTACTOE',
    name: 'Jogo da Velha',
    shortName: 'Velha',
    description: 'Dois jogadores disputam enquanto o resto da sala assiste.',
  },
];

export function getGame(type?: GameType) {
  return games.find((game) => game.type === type) || games[0];
}
