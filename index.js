// 1. 주요 클래스 가져오기
const { Client, Events, GatewayIntentBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { token } = require('./config.json');

// 2. 클라이언트 객체 생성 (Guilds관련, 메시지관련 인텐트 추가)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// 3. 봇이 준비됐을때 한번만(once) 표시할 메시지
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// 4. '일정생성' 채널에 버튼 추가
client.on(Events.MessageCreate, async (message) => {
    if (message.channel.name === '📅︱일정생성' && !message.author.bot) {
        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('raid_button')
                    .setLabel('레이드')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('event_button')
                    .setLabel('이벤트')
                    .setStyle(ButtonStyle.Success),
            );

        await message.channel.send({
            embeds: [{
                title: '**일정 생성 방법**',
                description: `1️⃣  생성하려는 일정 타입을 선택합니다.\n\n` + // 줄바꿈 추가
                    `2️⃣  제공된 양식에 맞춰 파티 정보를 작성하신 뒤, 전송 버튼을 눌러주세요.\n\n` + // 줄바꿈 추가
                    `3️⃣  전송한 글은 <#1331474901189525564>에 포스트가 생성됩니다.\n\n` + // 줄바꿈 추가
                    `4️⃣  포스트에서 참여 및 인원을 관리할 수 있습니다.\n\n`,
                color: 0x0099ff,
            }],
            components: [buttonRow],
        });
    }
});

// 5. 버튼 클릭 이벤트 처리
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    // 레이드 버튼과 이벤트 버튼의 customId를 확인
    if (interaction.customId !== 'raid_button' && interaction.customId !== 'event_button') {
        return; // 해당 버튼이 아닐 경우 모달을 표시하지 않음
    }

    // 모달 생성
    const modal = new ModalBuilder()
        .setCustomId('schedule_modal')
        .setTitle('일정 생성');

    // 텍스트 입력 필드 추가
    const titleInput = new TextInputBuilder()
        .setCustomId('title_input')
        .setLabel('일정제목')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('생성하려는 일정의 제목을 입력해주세요')
        .setMaxLength(50);

    const scheduleInput = new TextInputBuilder()
        .setCustomId('schedule_input')
        .setLabel('일시')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('작성양식: 0월 0일 0요일 오전/오후 00시')
        .setMaxLength(50);

    const jobInput = new TextInputBuilder()
        .setCustomId('job_input')
        .setLabel('구인직업 및 인원')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('예: 탱 2, 힐 4, 딜 14')
        .setMaxLength(50);

    const requirementInput = new TextInputBuilder()
        .setCustomId('requirement_input')
        .setLabel('요구조건')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('예: 600+ 아이템 레벨')
        .setMaxLength(50);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('description_input')
        .setLabel('설명')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('추가적인 설명을 입력하세요')
        .setMaxLength(500);

    // 입력 필드를 모달에 추가
    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(scheduleInput),
        new ActionRowBuilder().addComponents(jobInput),
        new ActionRowBuilder().addComponents(requirementInput),
        new ActionRowBuilder().addComponents(descriptionInput),
    );

    // 모달 표시
    await interaction.showModal(modal);
});

// 6. 모달 제출 이벤트 처리
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit() && !interaction.isButton()) return;

    // 모달 제출 처리
    if (interaction.isModalSubmit() && interaction.customId === 'schedule_modal') {
        try {

            // interaction.fields가 정의되어 있는지 확인
            if (!interaction.fields) {
                throw new Error('Interaction fields are undefined');
            }

            const title = interaction.fields.getTextInputValue('title_input');
            const schedule = interaction.fields.getTextInputValue('schedule_input');
            const job = interaction.fields.getTextInputValue('job_input');
            const requirement = interaction.fields.getTextInputValue('requirement_input');
            const description = interaction.fields.getTextInputValue('description_input');

            const channel = interaction.guild.channels.cache.find(ch => ch.name === '🎪︱오락실︱일정' && ch.type === ChannelType.GuildForum);

            if (!channel) {
                return interaction.reply({ content: '채널을 찾을 수 없습니다.', flags: 64 });
            }

            // 포럼에 새 포스트 생성 및 메시지 전송
            const thread = await channel.threads.create({
                name: `${schedule}︱${title}`,
                autoArchiveDuration: 60,
                reason: '일정 생성',
                appliedTags: ['1333363041370116136'], // 모집중 태그 ID 추가
                message: {
                    embeds: [
                        {
                            title: title,
                            description: `파티 참여를 원하신다면 참여할 포지션의 버튼을 눌러주세요!`,
                            fields: [
                                {
                                    name: '⏰일시',
                                    value: schedule,
                                },
                                {
                                    name: '🙋‍♂️구인직업 및 인원',
                                    value: job,
                                },
                                {
                                    name: '✅요구조건',
                                    value: requirement,
                                },
                                {
                                    name: '📝설명',
                                    value: description,
                                }
                            ],
                            color: 0x0099ff,
                        },
                        {
                            title: '참여인원(0)',
                            fields: [
                                {
                                    name: `**탱커(0)**`,
                                    value: '',
                                },
                                {
                                    name: `**힐러(0)**`,
                                    value: '',
                                },
                                {
                                    name: `**근딜(0)**`,
                                    value: '',
                                },
                                {
                                    name: `**원딜(0)**`,
                                    value: '',
                                }
                            ],
                            color: 0x0099ff,
                        }
                    ],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('tank_button')
                                    .setLabel('탱커')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId('healer_button')
                                    .setLabel('힐러')
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId('melee_button')
                                    .setLabel('근딜')
                                    .setStyle(ButtonStyle.Danger),
                                new ButtonBuilder()
                                    .setCustomId('ranged_button')
                                    .setLabel('원딜')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId('cancel_button')
                                    .setLabel('참여취소')
                                    .setStyle(ButtonStyle.Secondary),
                            )
                    ],
                }
            });

            await interaction.reply({ content: '일정이 생성되었습니다!', flags: 64 });
        } catch (error) {
            console.error('Error creating thread or sending message:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: '메시지 전송 중 오류가 발생했습니다. 다시 시도해 주세요', flags: 64 });
            }
        }
    }

    // 버튼 클릭 처리
    if (interaction.isButton()) {
        const thread = interaction.channel; // 현재 채널(스레드)
        const messages = await thread.messages.fetch(); // 스레드의 모든 메시지를 가져옴
        const embedMessage = messages.find(msg => msg.embeds.length > 0); // 임베드가 있는 메시지 찾기

        // 임베드 메시지가 존재하지 않으면 종료
        if (!embedMessage || !embedMessage.embeds || embedMessage.embeds.length === 0) {
            if (!interaction.replied) {
                return
            }
            return; // 이미 응답이 전송된 경우 추가 응답을 하지 않음
        }

        // 두 번째 임베드가 존재하는지 확인
        if (embedMessage.embeds.length < 2) {
            if (!interaction.replied) {
                return
            }
            return; // 이미 응답이 전송된 경우 추가 응답을 하지 않음
        }

        const embed = embedMessage.embeds[1]; // 두 번째 임베드 가져오기
        const userName = interaction.member.displayName; // 서버 닉네임 가져오기

        let updatedFields = [];
        let alreadyParticipated = false; // 이미 참여했는지 여부
        let totalParticipants = 0; // 총 참여 인원 수 초기화
        let isCancellation = interaction.customId === 'cancel_button'; // 참여 취소 버튼인지 확인

        for (const field of embed.fields) {
            const match = field.name.match(/\*\*(.*?)\((\d+)\)\*\*/);
            if (!match) {
                updatedFields.push(field); // 매치가 없으면 원래 필드 추가
                continue;
            }

            const [role] = match.slice(1);
            let newValue = field.value.split(', ').filter(name => name); // 현재 필드의 사용자 이름 배열

            // 사용자가 이미 참여했는지 확인
            if (newValue.includes(userName)) {
                alreadyParticipated = true; // 이미 참여한 경우 플래그 설정

                if (isCancellation) {
                    // 참여 취소인 경우
                    newValue = newValue.filter(name => name !== userName); // 사용자 이름 제거

                    // 참여 취소 메시지 전송
                    if (!interaction.replied) {
                        await interaction.reply({
                            content: '참여가 취소되었습니다.',
                            flags: 64, // ephemeral 플래그 대신 사용
                        });
                    }
                }
            } else if (!isCancellation) {
                // 참여 취소가 아닌 경우
                // 버튼 클릭에 따라 카운트 증가
                if ((interaction.customId === 'tank_button' && role === '탱커') ||
                    (interaction.customId === 'healer_button' && role === '힐러') ||
                    (interaction.customId === 'melee_button' && role === '근딜') ||
                    (interaction.customId === 'ranged_button' && role === '원딜')) {

                    if (!newValue.includes(userName)) {
                        newValue.push(userName); // 사용자 이름 추가
                    }
                }
            }

            // 참여한 경우 다른 버튼 클릭 무시
            if (alreadyParticipated && !isCancellation) {
                if (!interaction.replied) {
                    await interaction.reply({
                        content: '신청 완료! 포지션 변경을 원하시면 취소 후 재신청해주세요',
                        flags: 64,
                    });
                }
                return; // 추가적인 버튼 클릭 처리 중단
            }

            // 업데이트된 필드 추가
            updatedFields.push({
                name: `**${role}(${newValue.length})**`, // 사용자 이름의 개수로 업데이트
                value: newValue.join(', '), // 사용자 이름을 쉼표로 구분하여 문자열로 변환
            });

            // 총 참여 인원 수 업데이트
            totalParticipants += newValue.length;
        }

        // 이미 참여한 경우 개인 메시지 응답
        if (alreadyParticipated && isCancellation) {

            // 두 번째 임베드의 제목 업데이트
            const updatedTitle = `참여인원(${totalParticipants})`; // 총 참여 인원 수로 업데이트

            // 임베드 업데이트
            if (embedMessage && embedMessage.embeds && embedMessage.embeds.length > 0) {
                await embedMessage.edit({
                    embeds: [
                        {
                            title: embedMessage.embeds[0].title, // 첫 번째 임베드의 제목
                            description: embedMessage.embeds[0].description || '', // 첫 번째 임베드의 설명
                            fields: embedMessage.embeds[0].fields || [], // 첫 번째 임베드의 필드
                            color: embedMessage.embeds[0].color || 0x0099ff, // 첫 번째 임베드의 색상
                        },
                        {
                            title: updatedTitle, // 업데이트된 타이틀 사용
                            description: embed.description || '', // 기존 설명 유지, 없으면 빈 문자열
                            fields: updatedFields.length > 0 ? updatedFields : embed.fields, // 업데이트된 필드가 있으면 사용, 없으면 두 번째 임베드의 기존 필드 사용
                            color: embedMessage.embeds[1].color || 0x0099ff, // 두 번째 임베드의 색상
                        }
                    ]
                });
            } else {
                console.error("임베드 메시지가 존재하지 않거나 비어 있습니다");
            }
            return; // 참여 취소 후 더 이상 진행하지 않음
        }

        // 두 번째 임베드의 제목 업데이트
        const updatedTitle = `참여인원(${totalParticipants})`; // 총 참여 인원 수로 업데이트

        // 임베드 업데이트
        if (embedMessage && embedMessage.embeds && embedMessage.embeds.length > 0) {
            await embedMessage.edit({
                embeds: [
                    {
                        title: embedMessage.embeds[0].title, // 첫 번째 임베드의 제목
                        description: embedMessage.embeds[0].description || '', // 첫 번째 임베드의 설명
                        fields: embedMessage.embeds[0].fields || [], // 첫 번째 임베드의 필드
                        color: embedMessage.embeds[0].color || 0x0099ff, // 첫 번째 임베드의 색상
                    },
                    {
                        title: updatedTitle, // 업데이트된 타이틀 사용
                        description: embed.description || '', // 기존 설명 유지, 없으면 빈 문자열
                        fields: updatedFields.length > 0 ? updatedFields : embed.fields, // 업데이트된 필드가 있으면 사용, 없으면 두 번째 임베드의 기존 필드 사용
                        color: embedMessage.embeds[1].color || 0x0099ff, // 두 번째 임베드의 색상
                    }
                ]
            });
        } else {
            console.error("임베드 메시지가 존재하지 않거나 비어 있습니다");
        }

        // 응답이 이미 보내졌는지 확인
        if (!interaction.replied) {
            await interaction.reply({ content: '참여 신청이 완료되었습니다!', flags: 64 });
        } else {
            await interaction.followUp({ content: '참여 신청이 완료되었습니다!', flags: 64 });
        }
    }


    /*// 종료 버튼 처리
    if (interaction.isButton() && interaction.customId === 'close_recruitment_button') {
        const thread = interaction.channel; // 현재 채널(스레드)을 가져옴
 
        if (thread.appliedTags.includes('1333436004211626075')) { // 모집중 태그 ID 확인
            try {
                // 태그를 '마감'으로 변경
                await thread.setAppliedTags(['1333436022935261206']); // 마감 태그 ID로 변경
                if (!interaction.replied) {
                    await interaction.reply({ content: '포스트의 태그가 "마감"으로 변경되었습니다.', flags: 64 }); // ephemeral을 flags로 변경
                }
            } catch (error) {
                console.error('Error updating thread tags:', error);
                if (!interaction.replied) {
                    await interaction.reply({ content: '태그 변경 중 오류가 발생했습니다. 다시 시도해 주세요.', flags: 64 }); // ephemeral을 flags로 변경
                }
            }
        } else {
            if (!interaction.replied) {
                await interaction.reply({ content: '이 포스트는 이미 마감되었습니다.', flags: 64 }); // ephemeral을 flags로 변경
            }
        }
    }*/
});



// 9. 시크릿키(토큰)을 통해 봇 로그인 실행
client.login(token);
