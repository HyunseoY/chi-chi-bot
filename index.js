// 1. 주요 클래스 가져오기
const { Client, Events, GatewayIntentBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { token } = require('./config.json');

// 2. 클라이언트 객체 생성 (Guilds관련, 메시지관련 인텐트 추가)
const client = new Client({ intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
]});

// 3. 봇이 준비됐을때 한번만(once) 표시할 메시지
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// 4. '일정생성' 채널에 버튼 추가
client.on(Events.MessageCreate, async (message) => {
    if (message.channel.name === '일정생성' && !message.author.bot) {
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
                                 `3️⃣  전송한 글은 🎪︱오락실︱일정 포럼에 포스트가 생성됩니다.\n\n` + // 줄바꿈 추가
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

    // 포스트 목록을 가져오는 함수
    const getPosts = async (channel) => {
        const threads = await channel.threads.fetch();
        return threads.threads.map(thread => ({
            id: thread.id,
            name: thread.name,
            message: thread.lastMessage?.content || '내용 없음',
        }));
    };

    // 모달 생성
    const modal = new ModalBuilder()
        .setCustomId('schedule_modal')
        .setTitle('일정 생성');

    // 텍스트 입력 필드 추가
    const titleInput = new TextInputBuilder()
        .setCustomId('title_input')
        .setLabel('일정 제목')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const scheduleInput = new TextInputBuilder()
        .setCustomId('schedule_input')
        .setLabel('일시')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const jobInput = new TextInputBuilder()
        .setCustomId('job_input')
        .setLabel('구인직업 및 인원')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const requirementInput = new TextInputBuilder()
        .setCustomId('requirement_input')
        .setLabel('요구조건')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('description_input')
        .setLabel('설명')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

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
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'schedule_modal') {
        try {
            const title = interaction.fields.getTextInputValue('title_input');
            const schedule = interaction.fields.getTextInputValue('schedule_input');
            const job = interaction.fields.getTextInputValue('job_input');
            const requirement = interaction.fields.getTextInputValue('requirement_input');
            const description = interaction.fields.getTextInputValue('description_input');

            const channel = interaction.guild.channels.cache.find(ch => ch.name === '오락실-일정' && ch.type === ChannelType.GuildForum);
            
            if (!channel) {
                return interaction.reply({ content: '오락실-일정 채널을 찾을 수 없습니다.', ephemeral: true });
            }

           // 포럼에 새 포스트 생성 및 메시지 전송
            const thread = await channel.threads.create({
                name: `${schedule}︱${title}`,
                autoArchiveDuration: 60,
                reason: '일정 생성',
                message: {
                    embeds: [{
                        description: `\`\`\`⏰일시\`\`\`${schedule}\n\n \`\`\`🙋‍♂️구인직업 및 인원\`\`\`${job}\n\n \`\`\`✅요구조건\`\`\`${requirement}\n\n \`\`\`📝설명\`\`\` ${description}`,
                        color: 0x0099ff,
                    }]
                }
            });

            await interaction.reply({ content: '일정이 생성되었습니다!', ephemeral: true });
        } catch (error) {
            console.error('Error creating thread or sending message:', error);
            await interaction.reply({ content: '메시지 전송 중 오류가 발생했습니다. 다시 시도해 주세요.', ephemeral: true });
        }
    }
});

// 7. 포스트 수정 기능 추가
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    const channel = interaction.guild.channels.cache.find(ch => ch.name === '오락실-일정' && ch.type === ChannelType.GuildForum);
    const posts = await getPosts(channel);

    // 포스트 목록을 보여주는 모달 생성
    const postSelectModal = new ModalBuilder()
        .setCustomId('post_select_modal')
        .setTitle('수정할 포스트 선택');

    const postSelectInput = new TextInputBuilder()
        .setCustomId('post_select_input')
        .setLabel('수정할 포스트를 선택하세요')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder(posts.map(post => `${post.name} (ID: ${post.id})`).join('\n'));

    postSelectModal.addComponents(
        new ActionRowBuilder().addComponents(postSelectInput),
    );

    await interaction.showModal(postSelectModal);
});

// 8. 선택한 포스트 수정
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'post_select_modal') {
        const selectedPostId = interaction.fields.getTextInputValue('post_select_input');

        // 선택한 포스트의 내용을 가져와서 수정할 수 있는 모달 표시
        const selectedPost = await channel.threads.fetch(selectedPostId);
        if (!selectedPost) {
            return interaction.reply({ content: '선택한 포스트를 찾을 수 없습니다.', ephemeral: true });
        }

        // 수정할 내용을 입력할 모달 생성
        const editModal = new ModalBuilder()
            .setCustomId('edit_post_modal')
            .setTitle('포스트 수정');

        const editInput = new TextInputBuilder()
            .setCustomId('edit_input')
            .setLabel('수정할 내용')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setValue(selectedPost.content);

        editModal.addComponents(
            new ActionRowBuilder().addComponents(editInput),
        );

        await interaction.showModal(editModal);
    }
});

// 9. 수정된 포스트 내용 저장
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'edit_post_modal') {
        const newContent = interaction.fields.getTextInputValue('edit_input');
        const selectedPostId = interaction.customId; // 선택한 포스트 ID를 가져오는 방법을 수정해야 함

        const selectedPost = await channel.threads.fetch(selectedPostId);
        if (!selectedPost) {
            return interaction.reply({ content: '선택한 포스트를 찾을 수 없습니다.', ephemeral: true });
        }

        await selectedPost.setContent(newContent);
        await interaction.reply({ content: '포스트가 수정되었습니다!', ephemeral: true });
    }
});

// 10. 시크릿키(토큰)을 통해 봇 로그인 실행
client.login(token);