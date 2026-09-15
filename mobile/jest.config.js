/**
 * Les tests de l'application.
 *
 * Volontairement limités aux fichiers PURS : de la géométrie, des règles, des
 * conversions. Pas de composants React Native — les tester demanderait tout
 * un environnement de rendu, pour vérifier surtout que React fonctionne.
 *
 * C'est la même règle que côté serveur : on teste ce qui peut se tromper en
 * silence, pas ce qui se voit à l'écran.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};
