package com.mainpart;

import java.awt.*;
import java.io.File;
import java.io.IOException;
import javax.imageio.ImageIO;
import javax.swing.*;

public class AlgesGraphics
{
    //frame and independent panels
    JFrame frame;
    JPanel panelMain;
    JPanel upButtons;
    JPanel algorithm;
    JPanel consolePanel;
    JTabbedPane rightMenu;

    //Panels of rightMenu panel;
    JPanel condPan;
    JPanel varsPan;
    JPanel screenPan;
    JPanel operatPan;
    JPanel comPan;

    //Ініціалізація графічних елементів
    JLabel logicBlock;
    JLabel logicContBlock;
    JLabel initBlock;
    JLabel beginBlock;
    JLabel endBlock;
    JLabel comBlock;

    //upButtons panel elements
    JButton newBut;
    JButton saveBut;
    JButton loadBut;
    JButton watchCodeBut;
    JButton runBut;
    JButton compileBut;

    //panels' elements
    //condPan elements
    JButton ifBut;
    JButton thenBut;
    JButton elseBut;
    JButton whileBut;
    JButton doBut;
    //operatPan elements
    JButton plusBut;
    JButton minusBut;
    JButton multBut;
    JButton divBut;
    JButton highBut;
    JButton lowBut;
    JButton equalsBut;
    JButton eHighBut;
    JButton eLowBut;
    //varsPan elements
    JButton newIntBut;
    JButton newStrBut;
    JButton newBoolBut;

    //screenPan elements
    JButton writeBut;
    //comPan elements
    JButton blStartBut;
    JButton blEndBut;
    JButton algStartBut;
    JButton algEndBut;

    JTextArea consoleOutput;

    AlgesGraphics() throws IOException {
        //creating objects for all graphics elements
        frame = new JFrame("AlgES 0.1");
        panelMain = new JPanel();
        upButtons = new JPanel();
        algorithm = new JPanel();
        algorithm.setPreferredSize(new Dimension(800, 400));
        consolePanel = new JPanel();
        rightMenu = new JTabbedPane();

        condPan = new JPanel();
        varsPan = new JPanel();
        screenPan = new JPanel();
        operatPan = new JPanel();

        //Задаємо зображення для графічних елементів
        logicBlock = new JLabel(new ImageIcon("logical.png"));
        logicBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
        logicContBlock = new JLabel(new ImageIcon("logicCont.png"));
        logicContBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
        initBlock = new JLabel(new ImageIcon("init.png"));
        initBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
        beginBlock = new JLabel(new ImageIcon("begin.png"));
        beginBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
        endBlock = new JLabel(new ImageIcon("end.png"));
        endBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
        comBlock = new JLabel(new ImageIcon("com.png"));
        comBlock.setAlignmentX(Component.CENTER_ALIGNMENT);

        comPan = new JPanel();
        newBut = new JButton("Новий");
        loadBut = new JButton("Завантажити");
        saveBut = new JButton("Зберегти");
        watchCodeBut = new JButton("Подивитися код");
        runBut = new JButton("Запустити");
        compileBut = new JButton("Скомпілювати");

        ifBut = new JButton("Якщо");
        elseBut = new JButton("Інакше");
        thenBut = new JButton("Тоді");
        whileBut = new JButton("Поки");
        doBut = new JButton("Виконувати");

        plusBut = new JButton("+");
        minusBut = new JButton("-");
        multBut = new JButton("*");
        divBut = new JButton("/");
        highBut = new JButton(">");
        lowBut = new JButton("<");
        equalsBut = new JButton("=");
        eHighBut = new JButton(">=");
        eLowBut = new JButton("<=");

        newIntBut = new JButton("<html><body><center>Нова цілочисельна змінна</center></body></html>");
        newStrBut = new JButton("<html><body><center>Нова строкова змінна</center></body></html>");
        newBoolBut = new JButton("<html><body><center>Нова логічна змінна</center></body></html>");

        writeBut = new JButton("Вивести");

        blStartBut = new JButton("Початок блоку");
        blEndBut = new JButton("Кінець блоку");
        algStartBut = new JButton("Початок алгоритму");
        algEndBut = new JButton("Кінець алгоритму");

        consoleOutput = new JTextArea();

        //adding properties to panels
        panelMain.setLayout(new BorderLayout());
        upButtons.setLayout(new FlowLayout());
        algorithm.setLayout(new BoxLayout(algorithm, BoxLayout.Y_AXIS));
        algorithm.setBackground(new Color(0x464847));
        consolePanel.setLayout(new FlowLayout());
        condPan.setLayout(new BoxLayout(condPan, BoxLayout.Y_AXIS));
        varsPan.setLayout(new BoxLayout(varsPan, BoxLayout.Y_AXIS));
        screenPan.setLayout(new BoxLayout(screenPan, BoxLayout.Y_AXIS));
        operatPan.setLayout(new BoxLayout(operatPan, BoxLayout.Y_AXIS));
        comPan.setLayout(new BoxLayout(comPan, BoxLayout.Y_AXIS));

        //setting the align of context menu elements
        ifBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        ifBut.setMaximumSize(new Dimension(200, 50));
        thenBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        thenBut.setMaximumSize(new Dimension(200, 50));
        elseBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        elseBut.setMaximumSize(new Dimension(200, 50));
        whileBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        whileBut.setMaximumSize(new Dimension(200, 50));
        doBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        doBut.setMaximumSize(new Dimension(200, 50));

        plusBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        plusBut.setMaximumSize(new Dimension(200, 50));
        minusBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        minusBut.setMaximumSize(new Dimension(200, 50));
        multBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        multBut.setMaximumSize(new Dimension(200, 50));
        divBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        divBut.setMaximumSize(new Dimension(200, 50));
        highBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        highBut.setMaximumSize(new Dimension(200, 50));
        lowBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        lowBut.setMaximumSize(new Dimension(200, 50));
        equalsBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        equalsBut.setMaximumSize(new Dimension(200, 50));
        eLowBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        eLowBut.setMaximumSize(new Dimension(200, 50));
        eHighBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        eHighBut.setMaximumSize(new Dimension(200, 50));

        newIntBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        newIntBut.setMaximumSize(new Dimension(200, 50));
        newStrBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        newStrBut.setMaximumSize(new Dimension(200, 50));
        newBoolBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        newBoolBut.setMaximumSize(new Dimension(200, 50));

        writeBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        writeBut.setMaximumSize(new Dimension(200, 50));

        blStartBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        blStartBut.setMaximumSize(new Dimension(200, 50));
        blEndBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        blEndBut.setMaximumSize(new Dimension(200, 50));
        algStartBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        algStartBut.setMaximumSize(new Dimension(200, 50));
        algEndBut.setAlignmentX(Component.CENTER_ALIGNMENT);
        algEndBut.setMaximumSize(new Dimension(200, 50));

        //assigning elements to condPan
        condPan.add(ifBut);
        condPan.add(thenBut);
        condPan.add(elseBut);
        condPan.add(whileBut);
        condPan.add(doBut);

        //assigning elements to operatPan
        operatPan.add(plusBut);
        operatPan.add(minusBut);
        operatPan.add(multBut);
        operatPan.add(divBut);
        operatPan.add(highBut);
        operatPan.add(lowBut);
        operatPan.add(equalsBut);
        operatPan.add(eHighBut);
        operatPan.add(eLowBut);

        //assigning elements to varsPan
        varsPan.add(newIntBut);
        varsPan.add(newStrBut);
        varsPan.add(newBoolBut);

        //assigning elements to screenPan
        screenPan.add(writeBut);

        //assigning elements to comPan
        comPan.add(blStartBut);
        comPan.add(blEndBut);
        comPan.add(algStartBut);
        comPan.add(algEndBut);

        //assigning elements to upButtons
        upButtons.add(newBut);
        upButtons.add(saveBut);
        upButtons.add(loadBut);
        upButtons.add(watchCodeBut);
        upButtons.add(runBut);
        upButtons.add(compileBut);

        //Додаємо елементи до consolePanel
        consolePanel.add(consoleOutput);

        //assigning panels, to rightMenu; using HTML to set the same width of tab buttons
        rightMenu.addTab("<html><body><table width='270'>Умови</table></body></html>", condPan);
        rightMenu.addTab("<html><body><table width='270'>Змінні</table></body></html>", varsPan);
        rightMenu.addTab("<html><body><table width='270'>Екран</table></body></html>", screenPan);
        rightMenu.addTab("<html><body><table width='270'>Оператори</table></body></html>", operatPan);
        rightMenu.addTab("<html><body><table width='270'>Команди</table></body></html>", comPan);
        panelMain.add("East", rightMenu);
        panelMain.add("North", upButtons);
        panelMain.add("South", consolePanel);
        panelMain.add("West", algorithm);

        //adding properties to frame
        frame.setContentPane(panelMain);
        frame.setSize(1024, 800);
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        frame.setResizable(false);
        frame.setVisible(true);

        //Реєструємо ActionListeners для кнопок
        AlgesEngine algesEngine = new AlgesEngine(this);
        //Реєструємо Runner для кнопки запуску
        AlgesRunner algesRunner = new AlgesRunner(this, algesEngine);

        //Для кнопок панелі керування
        newBut.addActionListener(algesEngine);
        loadBut.addActionListener(algesEngine);
        saveBut.addActionListener(algesEngine);
        watchCodeBut.addActionListener(algesEngine);
        runBut.addActionListener(algesRunner);
        compileBut.addActionListener(algesEngine);

        //кнопки панелі умов
        ifBut.addActionListener(algesEngine);
        thenBut.addActionListener(algesEngine);
        elseBut.addActionListener(algesEngine);
        whileBut.addActionListener(algesEngine);
        doBut.addActionListener(algesEngine);

        //кнопки панелі змінних
        newIntBut.addActionListener(algesEngine);
        newStrBut.addActionListener(algesEngine);
        newBoolBut.addActionListener(algesEngine);

        //кнопки панелі екрану
        writeBut.addActionListener(algesEngine);

        //кнопки панелі операторів
        plusBut.addActionListener(algesEngine);
        minusBut.addActionListener(algesEngine);
        multBut.addActionListener(algesEngine);
        divBut.addActionListener(algesEngine);
        highBut.addActionListener(algesEngine);
        lowBut.addActionListener(algesEngine);
        equalsBut.addActionListener(algesEngine);
        eLowBut.addActionListener(algesEngine);
        eHighBut.addActionListener(algesEngine);

        //кнопки панелі команд
        blStartBut.addActionListener(algesEngine);
        blEndBut.addActionListener(algesEngine);
        algStartBut.addActionListener(algesEngine);
        algEndBut.addActionListener(algesEngine);
    }

    public static void main(String[] args) throws IOException {
        AlgesGraphics alGraph = new AlgesGraphics();
    }
}
