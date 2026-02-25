export class ChallengeCompletedEvent {
    constructor(
        public readonly userId: string,
        public readonly challengeId: string,
        public readonly xpReward: number,
    ) { }
}
