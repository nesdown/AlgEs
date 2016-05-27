package com.mainpart;
import javax.imageio.ImageIO;
import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.io.*;
import java.util.*;

public class AlgesEngine extends Component implements ActionListener {
    //Усі дані натиснутих кнопок записуються у колекцію, утворюючи "проміжний код"
    ArrayList<String> intermCode = new ArrayList<>();
    Map<String, String> vars = new HashMap<String, String>();
    String log = "";
    String resVarInit = "";
    String resVarCom = "";
    boolean isThenUsed = false;
    boolean isElseUsed = false;
    boolean isIfUsed = false;
    boolean isBlStart = false;
    boolean isBlEnd = false;
    String resOutput = "";
    AlgesGraphics parent;

    AlgesEngine(AlgesGraphics parent) {
        this.parent = parent;
    }

    public void actionPerformed(ActionEvent e) {
        //Задаємо налаштування тексту зображень
        //Для зображення ініціалізації
        parent.initBlock.setIconTextGap(-190);
        parent.initBlock.setFont(new Font("Arial", Font.BOLD, 22));

        //Для зображення команди
        parent.comBlock.setIconTextGap(-190);
        parent.comBlock.setFont(new Font("Arial", Font.BOLD, 16));

        //Для зображення оператора
        parent.logicBlock.setIconTextGap(-200);
        parent.logicBlock.setFont(new Font("Arial", Font.BOLD, 16));

        parent.logicContBlock.setIconTextGap(-450);
        parent.logicContBlock.setFont(new Font("Arial", Font.BOLD, 16));

        parent.consoleOutput.setFont(new Font("Consolas", Font.BOLD, 25));

        Object clickedSource = e.getSource();

        //Перевірка натискання для елементів панелі умов
        if (clickedSource == parent.ifBut) {
            intermCode.add("if");
            isIfUsed = true;
            parent.algorithm.add(parent.logicBlock);
            parent.algorithm.add(parent.logicContBlock);
            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        else if (clickedSource == parent.thenBut) {
            intermCode.add("then");
            isThenUsed = true;
        }

        else if (clickedSource == parent.elseBut) {
            intermCode.add("else");
            isElseUsed = true;
        }

        /*else if (clickedSource == parent.whileBut)
            intermCode.add("while");

        else if (clickedSource == parent.doBut)
            intermCode.add("do");*/

        //Для панелі змінних
        //Опрацьовуємо створення нової змінної
        else if (clickedSource == parent.newIntBut){
            String varName = JOptionPane.showInputDialog("Введіть назву змінної: ");
            String varVal = JOptionPane.showInputDialog("Введіть значення змінної: ");
            vars.put(varName, varVal);

            intermCode.add("int");
            intermCode.add(varName);
            intermCode.add(varVal);

            resVarInit = resVarInit + varName + "; ";
            resVarCom =  resVarCom + varName + " = " + varVal + "; ";

            parent.initBlock.setText(resVarInit);
            parent.algorithm.add(parent.initBlock);
            parent.comBlock.setText(resVarCom);
            parent.algorithm.add(parent.comBlock);

            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        else if (clickedSource == parent.newStrBut) {
            String varName = JOptionPane.showInputDialog("Введіть назву змінної: ");
            String varVal = JOptionPane.showInputDialog("Введіть значення змінної: ");
            vars.put(varName, varVal);

            intermCode.add("str");
            intermCode.add(varName);
            intermCode.add(varVal);

            resVarInit = resVarInit + varName + "; ";
            resVarCom = resVarCom + varName + " = " + varVal + "; ";

            parent.initBlock.setText(resVarInit);
            parent.algorithm.add(parent.initBlock);
            parent.comBlock.setText(resVarCom);
            parent.algorithm.add(parent.comBlock);

            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        else if (clickedSource == parent.newBoolBut){
            String varName = JOptionPane.showInputDialog("Введіть назву змінної: ");
            String varVal = JOptionPane.showInputDialog("Введіть значення змінної: ");
            vars.put(varName, varVal);

            intermCode.add("bool");
            intermCode.add(varName);
            intermCode.add(varVal);

            resVarInit = resVarInit + varName + "; ";
            resVarCom = resVarCom + varName + " = " + varVal + "; ";

            parent.initBlock.setText(resVarInit);
            parent.algorithm.add(parent.initBlock);
            parent.comBlock.setText(resVarCom);
            parent.algorithm.add(parent.comBlock);

            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        //Для панелі екрану
        //Команда виводу тексту в консоль
        else if (clickedSource == parent.writeBut) {
            if(isThenUsed == false && isElseUsed == false)
                intermCode.add("wr");
            resOutput = JOptionPane.showInputDialog("Введіть текст/назву змінної " +
                    "(Увага! При вводі звичайного тесту використайте лапки):");
            intermCode.add(resOutput);

            if (isThenUsed == true) {
                intermCode.add("thwr");
                parent.logicContBlock.setText(resOutput);
                isThenUsed = false;
            }

            else if(isElseUsed == true) {
                intermCode.add("ewr");
                String toAdd = parent.logicContBlock.getText();
                parent.logicContBlock.setText(toAdd + "                                                        "
                        + resOutput);
                isElseUsed = false;
            }

            else {
                JLabel curComBlock =
                        new JLabel(new ImageIcon("com.png"));
                curComBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
                curComBlock.setIconTextGap(-190);
                curComBlock.setFont(new Font("Arial", Font.BOLD, 16));
                parent.algorithm.add(curComBlock);
                curComBlock.setText("Вивести: " + resOutput);
            }

            parent.algorithm.updateUI();
            parent.frame.repaint();
        }


        //Для панелі операторів
        else if (clickedSource == parent.plusBut) {
            String sum1 = JOptionPane.showInputDialog("Ввести значення першого доданка (число/змінну): ");
            String sum2 = JOptionPane.showInputDialog("Ввести значення другого доданка (число/змінну): ");
                intermCode.add("op");
                intermCode.add(sum1);
                intermCode.add("+");
                intermCode.add(sum2);


            if(isThenUsed == true) {
                parent.logicContBlock.setText(sum1 + " + " + sum2);
                isThenUsed = false;
            }

            else if(isElseUsed == true) {
                String toAdd = parent.logicContBlock.getText();
                parent.logicContBlock.setText(toAdd + "                                                     "
                + sum1 + " + " + sum2);
                isElseUsed = false;
            }

            else {
                //Малювання блоку
                JLabel plComBlock =
                        new JLabel(new ImageIcon("com.png"));
                plComBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
                plComBlock.setIconTextGap(-190);
                plComBlock.setFont(new Font("Arial", Font.BOLD, 16));
                parent.algorithm.add(plComBlock);
                plComBlock.setText(sum1 + " + " + sum2);

                parent.algorithm.updateUI();
                parent.frame.repaint();
            }
        }

        else if (clickedSource == parent.minusBut) {
            String min1 = JOptionPane.showInputDialog("Ввести значення зменшуваного (число/змінну): ");
            String min2 = JOptionPane.showInputDialog("Ввести значення від'ємника (число/змінну): ");
                intermCode.add("op");
                intermCode.add(min1);
                intermCode.add("-");
                intermCode.add(min2);

            if(isThenUsed == true) {
                parent.logicContBlock.setText(min1 + " - " + min2);
                isThenUsed = false;
            }

            else if (isElseUsed == true) {
                String toAdd = parent.logicContBlock.getText();
                parent.logicContBlock.setText(toAdd + "                                                     "
                + min1 + " - " + min2);
                isElseUsed = false;
            }

            else {
                //Малювання блоку
                JLabel minComBlock =
                        new JLabel(new ImageIcon("com.png"));
                minComBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
                minComBlock.setIconTextGap(-190);
                minComBlock.setFont(new Font("Arial", Font.BOLD, 16));
                parent.algorithm.add(minComBlock);
                minComBlock.setText(min1 + " - " + min2);

                parent.algorithm.updateUI();
                parent.frame.repaint();
            }
        }

        else if (clickedSource == parent.multBut) {
            String mult1 = JOptionPane.showInputDialog("Ввести значення першого множника (число/змінну): ");
            String mult2 = JOptionPane.showInputDialog("Ввести значення другого множника (число/змінну): ");
                intermCode.add("op");
                intermCode.add(mult1);
                intermCode.add("*");
                intermCode.add(mult2);

            if(isThenUsed == true) {
                parent.logicContBlock.setText(mult1 + " * " + mult2);
                isThenUsed = false;
            }

            else if (isElseUsed == true) {
                String toAdd = parent.logicContBlock.getText();
                parent.logicContBlock.setText(toAdd + "                                                     "
                + mult1 + " * " + mult2);
                isElseUsed = false;
            }

            else {
                //Малювання блоку
                JLabel multComBlock =
                        new JLabel(new ImageIcon("com.png"));
                multComBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
                multComBlock.setIconTextGap(-190);
                multComBlock.setFont(new Font("Arial", Font.BOLD, 16));
                parent.algorithm.add(multComBlock);
                multComBlock.setText(mult1 + " * " + mult2);
            }

            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        else if (clickedSource == parent.divBut) {
            String div1 = JOptionPane.showInputDialog("Ввести ділене (число/змінну): ");
            String div2 = JOptionPane.showInputDialog("Ввести дільник (число/змінну): ");
            intermCode.add("op");
            intermCode.add(div1);
            intermCode.add("/");
            intermCode.add(div2);


            if(isThenUsed == true) {
                parent.logicContBlock.setText(div1 + " / " + div2);
                isThenUsed = false;
            }

            else if (isElseUsed == true) {
                String toAdd = parent.logicContBlock.getText();
                parent.logicContBlock.setText(toAdd + "                                                              "
                + div1 + " / " + div2);
                isElseUsed = false;
            }

            else {
                //Малювання блоку
                JLabel divComBlock =
                        new JLabel(new ImageIcon("com.png"));
                divComBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
                divComBlock.setIconTextGap(-190);
                divComBlock.setFont(new Font("Arial", Font.BOLD, 16));
                parent.algorithm.add(divComBlock);
                divComBlock.setText(div1 + " / " + div2);
            }

            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        else if (clickedSource == parent.lowBut) {
            String lComp1 = JOptionPane.showInputDialog("Ввести перше значення (число/змінну): ");
            String lComp2 = JOptionPane.showInputDialog("Ввести друге значення (число/змінну): ");
            intermCode.add("op");
            intermCode.add(lComp1);
            intermCode.add("<");
            intermCode.add(lComp2);

            if(isIfUsed == false) {
                //Малювання блоку
                JLabel lCompComBlock =
                        new JLabel(new ImageIcon("com.png"));
                lCompComBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
                lCompComBlock.setIconTextGap(-190);
                lCompComBlock.setFont(new Font("Arial", Font.BOLD, 16));
                parent.algorithm.add(lCompComBlock);
                lCompComBlock.setText(lComp1 + " < " + lComp2);
            }

            else if(isIfUsed == true) {
                parent.logicBlock.setText("Якщо " + lComp1 + " < " + lComp2);
                isIfUsed = false;
            }

            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        else if (clickedSource == parent.highBut) {
            String hComp1 = JOptionPane.showInputDialog("Ввести перше значення (число/змінну): ");
            String hComp2 = JOptionPane.showInputDialog("Ввести друге значення (число/змінну): ");
            intermCode.add("op");
            intermCode.add(hComp1);
            intermCode.add(">");
            intermCode.add(hComp2);

            if(isIfUsed == false) {
                //Малювання блоку
                JLabel hCompComBlock =
                        new JLabel(new ImageIcon("com.png"));
                hCompComBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
                hCompComBlock.setIconTextGap(-190);
                hCompComBlock.setFont(new Font("Arial", Font.BOLD, 16));
                parent.algorithm.add(hCompComBlock);
                hCompComBlock.setText(hComp1 + " > " + hComp2);
            }

            else if(isIfUsed == true) {
                parent.logicBlock.setText("Якщо " + hComp1 + " > " + hComp2);
                isIfUsed = false;
            }

            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        else if (clickedSource == parent.equalsBut) {
            String eVal1 = JOptionPane.showInputDialog("Ввести перше значення (число/змінну): ");
            String eVal2 = JOptionPane.showInputDialog("Ввести друге значення (число/змінну): ");
            intermCode.add("op");
            intermCode.add(eVal1);
            intermCode.add("=");
            intermCode.add(eVal2);

            if(isIfUsed == false) {
                if(isThenUsed == true) {
                    parent.logicContBlock.setText(eVal1 + " = " + eVal2);
                    isThenUsed = false;
                }

                else if(isElseUsed == true) {
                    String toAdd = parent.logicContBlock.getText();
                    parent.logicContBlock.setText(toAdd + "                                                     "
                    + eVal1 + " = " + eVal2);
                    isElseUsed = false;
                }

                else {
                    //Малювання блоку
                    JLabel eCompComBlock =
                            new JLabel(new ImageIcon("com.png"));
                    eCompComBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
                    eCompComBlock.setIconTextGap(-190);
                    eCompComBlock.setFont(new Font("Arial", Font.BOLD, 16));
                    parent.algorithm.add(eCompComBlock);
                    eCompComBlock.setText(eVal1 + " = " + eVal2);
                }
            }

            else if (isIfUsed == true) {
                parent.logicBlock.setText("Якщо " + eVal1 + " = " + eVal2);
                isIfUsed = false;
            }

            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        else if (clickedSource == parent.eHighBut) {
            String eHComp1 = JOptionPane.showInputDialog("Ввести перше значення (число/змінну): ");
            String eHComp2 = JOptionPane.showInputDialog("Ввести друге значення (число/змінну): ");
            intermCode.add("op");
            intermCode.add(eHComp1);
            intermCode.add(">=");
            intermCode.add(eHComp2);

            if(isIfUsed == false) {
                //Малювання блоку
                JLabel eHCompComBlock =
                        new JLabel(new ImageIcon("com.png"));
                eHCompComBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
                eHCompComBlock.setIconTextGap(-190);
                eHCompComBlock.setFont(new Font("Arial", Font.BOLD, 16));
                parent.algorithm.add(eHCompComBlock);
                eHCompComBlock.setText(eHComp1 + " >= " + eHComp2);
            }

            else if(isIfUsed == true) {
                parent.logicBlock.setText("Якщо " + eHComp1 + ">=" + eHComp2);
                isIfUsed = false;
            }

            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        else if (clickedSource == parent.eLowBut) {
            String eLComp1 = JOptionPane.showInputDialog("Ввести перше значення (число/змінну): ");
            String eLComp2 = JOptionPane.showInputDialog("Ввести друге значення (число/змінну): ");
            intermCode.add("op");
            intermCode.add(eLComp1);
            intermCode.add("<=");
            intermCode.add(eLComp2);

            if(isIfUsed == false) {
                //Малювання блоку
                JLabel eLCompComBlock =
                        new JLabel(new ImageIcon("com.png"));
                eLCompComBlock.setAlignmentX(Component.CENTER_ALIGNMENT);
                eLCompComBlock.setIconTextGap(-190);
                eLCompComBlock.setFont(new Font("Arial", Font.BOLD, 16));
                parent.algorithm.add(eLCompComBlock);
                eLCompComBlock.setText(eLComp1 + " <= " + eLComp2);
            }

            else if(isIfUsed == true) {
                parent.logicBlock.setText("Якщо " + eLComp1 + " <= " + eLComp2);
                isIfUsed = false;
            }

            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        //Для панелі команд
        else if (clickedSource == parent.blStartBut) {
            intermCode.add("blS");
            isBlStart = true;
        }

        else if (clickedSource == parent.blEndBut) {
            intermCode.add("blE");
            isBlEnd = false;
        }

        else if (clickedSource == parent.algStartBut) {
            intermCode.add("algS");
            parent.algorithm.add(parent.beginBlock);
            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        else if (clickedSource == parent.algEndBut) {
            intermCode.add("algE");
            parent.algorithm.add(parent.endBlock);
            parent.algorithm.updateUI();
            parent.frame.repaint();
        }

        //Для панелі керування
        //Відповідає за вивід "проміжного коду" в консоль
        else if (clickedSource == parent.watchCodeBut) {
            for(int i = 0; i < intermCode.size(); i++) {
                String prevLog = intermCode.get(i);
                log = log + " " + prevLog;
                parent.consoleOutput.cut();
                parent.consoleOutput.setText(log + " ");
                System.out.println(intermCode.get(i));
            }
        }

        else if (clickedSource == parent.saveBut) {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
                JFileChooser savePath = new JFileChooser();
                savePath.showSaveDialog(this);
                savePath.setDialogType(JFileChooser.SAVE_DIALOG);

                File toSave = savePath.getSelectedFile();

                OutputStream inStream = new FileOutputStream(toSave);
                for (int i = 0; i < intermCode.size(); i++) {
                    inStream.write((intermCode.get(i) + " ").getBytes());
                }
                inStream.close();
            }

            catch(Exception exc) {
                parent.consoleOutput.cut();
                parent.consoleOutput.setText(String.valueOf(exc));
            }
        }

        else if (clickedSource == parent.loadBut) {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
                JFileChooser loadPath = new JFileChooser();
                loadPath.showOpenDialog(this);
                loadPath.setDialogType(JFileChooser.OPEN_DIALOG);

                File toOpen = loadPath.getSelectedFile();
                intermCode.removeAll(intermCode);
                String allCode = "";

                Scanner reader = new Scanner(toOpen);
                while (reader.hasNext()) {
                    intermCode.add(reader.next());
                }

                for(int  i = 0; i < intermCode.size(); i++) {
                    if(intermCode.get(i).equals(" "))
                        intermCode.remove(i);
                }

                for(int i = 0; i < intermCode.size(); i++) {
                    if(intermCode.get(i).equals("int") || intermCode.get(i).equals("bool") || intermCode.get(i).equals("str")) {
                        vars.put(intermCode.get(i+1), intermCode.get(i+2));
                    }
                }
            }

            catch(Exception exc) {
                parent.consoleOutput.cut();
                parent.consoleOutput.setText(String.valueOf(exc));
            }
        }

        else if (clickedSource == parent.newBut) {
            intermCode.removeAll(intermCode);
            vars.clear();
            resVarInit = "";
            resVarCom = "";
            parent.algorithm.removeAll();
            parent.frame.repaint();
            parent.consoleOutput.cut();
        }
    }
}



