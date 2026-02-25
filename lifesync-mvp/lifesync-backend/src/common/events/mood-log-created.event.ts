export class MoodLogCreatedEvent {
    constructor(
        public readonly userId: string,
        public readonly moodLogId: string,
        public readonly xpToAward: number = 5,
    ) { }
}
